/**
 * A second Discord bot ("the listener") used by the e2e tests.
 *
 * It runs in a SEPARATE child process (`listener-worker.cjs`), because
 * `@discordjs/voice` keeps voice connections in a process-global store keyed by
 * guildId: a second client in the same process would silently reuse the first's
 * connection and never receive audio. Communication is over IPC.
 */
import { fork, ChildProcess } from 'child_process';
import { join as joinPath } from 'path';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';

import { withTimeout } from './async-utils';
import { decodeRecording } from './audio-analysis';

export interface RecordingResult {
  frames: Buffer[];
  pcm: Float32Array;
}

interface WorkerMessage {
  type: string;
  [key: string]: unknown;
}

export class DiscordListener {
  private child: ChildProcess | null = null;
  private outDir: string | null = null;
  private pendingJoin: (() => void) | null = null;
  private rejectJoin: ((reason: Error) => void) | null = null;
  private pendingReady: (() => void) | null = null;
  private rejectReady: ((reason: Error) => void) | null = null;
  private presenceListeners = new Set<(userId: string) => void>();

  async login(token: string): Promise<void> {
    await this.spawn(token);
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        this.pendingReady = () => resolve();
        this.rejectReady = reject;
      }),
      30_000,
      'Listener worker did not log into Discord. Check E2E_LISTENER_TOKEN.',
    );
  }

  async joinVoiceChannel(guildId: string, channelId: string): Promise<void> {
    if (!this.child) {
      throw new Error(
        'Listener must be logged in before joining a voice channel',
      );
    }

    const promise = new Promise<void>((resolve, reject) => {
      this.pendingJoin = () => resolve();
      this.rejectJoin = reject;
    });

    this.child.send({ type: 'join', guildId, channelId });
    await withTimeout(
      promise,
      30_000,
      `Listener did not finish joining voice channel ${channelId}. Check the listener ` +
        'has Connect+Speak permission and is invited to the guild.',
    );
  }

  /**
   * Resolves once the worker observes `userId` connected to the voice channel
   * via `voiceStateUpdate`.
   */
  waitForBotVoiceState(userId: string, timeoutMs = 10_000): Promise<string> {
    return withTimeout(
      new Promise<string>((resolve) => {
        const handler = (reportedUserId: string): void => {
          if (reportedUserId === userId) {
            this.presenceListeners.delete(handler);
            resolve(userId);
          }
        };
        this.presenceListeners.add(handler);
      }),
      timeoutMs,
      `Listener did not observe ${userId} joining the voice channel`,
    );
  }

  /**
   * Records audio from `targetUserId`, resolving when recording ends
   * (after `inactivityMs` of silence, or `maxDurationMs` as a hard cap so a
   * silent run fails fast instead of hanging).
   */
  startRecording(
    targetUserId: string,
    inactivityMs = 750,
    maxDurationMs = 60_000,
  ): Promise<RecordingResult> {
    if (!this.child || !this.outDir) {
      return Promise.reject(
        new Error('Listener must be logged in before recording'),
      );
    }

    const capture = new Promise<RecordingResult>((resolve, reject) => {
      this.recordingResolve = resolve;
      this.recordingReject = reject;
    });

    this.child.send({
      type: 'record',
      userId: targetUserId,
      inactivityMs,
      maxDurationMs,
    });

    return withTimeout(
      capture,
      Math.min(maxDurationMs + 10_000, 120_000),
      'Listener recording did not complete. No (usable) audio was relayed to the listener ' +
        '— check the bot actually plays and that both are in the channel.',
    );
  }

  getRecording(): RecordingResult {
    const result = this.lastResult;
    return result ?? { frames: [], pcm: new Float32Array(0) };
  }

  async destroy(): Promise<void> {
    if (this.child && !this.child.killed) {
      try {
        this.child.send({ type: 'shutdown' });
      } catch {
        // ignore
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!this.child.killed) {
        this.child.kill();
      }
      this.child = null;
    }
    if (this.outDir) {
      rmSync(this.outDir, { recursive: true, force: true });
      this.outDir = null;
    }
  }

  // ---- internals ----------------------------------------------------------

  private lastResult: RecordingResult | null = null;
  private recordingResolve: ((value: RecordingResult) => void) | null = null;
  private recordingReject: ((reason: Error) => void) | null = null;

  private spawn(token: string): void {
    this.outDir = mkdtempSync(joinPath(tmpdir(), 'jdf-e2e-listener-'));

    const workerPath = joinPath(__dirname, 'listener-worker.cjs');

    const child = fork(workerPath, [], {
      env: {
        ...process.env,
        E2E_LISTENER_TOKEN: token,
        OUT_DIR: this.outDir,
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      silent: true,
    });
    this.child = child;

    child.stdout?.on('data', (data: Buffer) => {
      process.stdout.write(`[listener] ${data.toString()}`);
    });
    child.stderr?.on('data', (data: Buffer) => {
      process.stderr.write(`[listener] ${data.toString()}`);
    });

    child.on('message', (raw: WorkerMessage) => this.onMessage(raw));
    child.on('error', (error) => {
      this.rejectAll(new Error(`Listener worker error: ${error.message}`));
    });
    child.on('exit', (code) => {
      this.rejectAll(
        new Error(`Listener worker exited unexpectedly (code ${code})`),
      );
    });
  }

  private onMessage(raw: WorkerMessage): void {
    switch (raw.type) {
      case 'ready':
        this.pendingReady?.();
        this.pendingReady = null;
        break;
      case 'joined':
        this.pendingJoin?.();
        this.pendingJoin = null;
        break;
      case 'inChannel': {
        const userId = String(raw.userId ?? '');
        for (const listener of this.presenceListeners) listener(userId);
        break;
      }
      case 'recordingDone': {
        const file = raw.file as string;
        const frames = raw.frames as number;
        try {
          const buf = readFileSync(file);
          const parsed = parseFrameFile(buf);
          const result: RecordingResult = {
            frames: parsed,
            pcm: decodeRecording(parsed),
          };
          this.lastResult = result;
          this.recordingResolve?.(result);
        } catch (error) {
          this.recordingReject?.(
            new Error(
              `Listener failed to decode ${frames} recorded frames: ${(error as Error).message}`,
            ),
          );
        }
        this.recordingResolve = null;
        this.recordingReject = null;
        break;
      }
      case 'error': {
        const err = new Error(`Listener worker error: ${raw.message}`);
        this.rejectAll(err);
        break;
      }
      default:
        break;
    }
  }

  private rejectAll(error: Error): void {
    this.rejectReady?.(error);
    this.rejectJoin?.(error);
    this.recordingReject?.(error);
    this.pendingReady = null;
    this.pendingJoin = null;
    this.recordingResolve = null;
    this.recordingReject = null;
  }
}

/** Parses the length-prefixed frame file the worker writes. */
function parseFrameFile(buffer: Buffer): Buffer[] {
  const frames: Buffer[] = [];
  let offset = 0;
  while (offset + 4 <= buffer.length) {
    const length = buffer.readUInt32LE(offset);
    offset += 4;
    if (offset + length > buffer.length) break;
    frames.push(buffer.subarray(offset, offset + length));
    offset += length;
  }
  return frames;
}
