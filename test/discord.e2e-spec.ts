/**
 * End-to-end tests for the Discord voice connection and audio playback: real
 * bots join a real voice channel and play audio; a second bot (the listener,
 * in its own process) records what Discord relays and compares it against the
 * source signal with leniency.
 *
 * Requires `DISCORD_CLIENT_TOKEN`, `E2E_LISTENER_TOKEN`, `E2E_DISCORD_GUILD_ID`
 * and `E2E_DISCORD_VOICE_CHANNEL_ID`. The suite is skipped when unconfigured.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
} from '@discordjs/voice';
import { VoiceChannel } from 'discord.js';

import { Track } from '../src/models/track';
import { EventNames } from '../src/events/names';

import { createBotUnderTest, BotUnderTest } from './helpers/e2e/bot-app';
import { DiscordListener } from './helpers/e2e/discord-listener';
import { MockJellyfinServer } from './helpers/e2e/mock-jellyfin-server';
import {
  compareAudio,
  pearsonCorrelation,
  AudioComparison,
} from './helpers/e2e/audio-analysis';
import { generateMelodySignal } from './helpers/e2e/audio-signal';
import {
  e2eConfigError,
  isE2eConfigured,
  loadE2eConfig,
} from './helpers/e2e/e2e-env';
import { preflightDiscordToken } from './helpers/e2e/preflight';

const config = loadE2eConfig();
const enabled = isE2eConfigured(config);

// Three distinct melodies so each playlist track is individually attributable.
const melodies = [
  generateMelodySignal({
    notes: [523.25, 659.25, 783.99, 880],
    amplitude: 0.45,
  }),
  generateMelodySignal({
    notes: [392, 523.25, 659.25, 783.99],
    amplitude: 0.45,
  }),
  generateMelodySignal({
    notes: [659.25, 783.99, 1046.5, 880],
    amplitude: 0.45,
  }),
];
const PLAY_TRACK_IDS = ['e2e-track-1', 'e2e-track-2', 'e2e-track-3'];

const e2e = {
  bot: undefined as unknown as BotUnderTest,
  listener: undefined as unknown as DiscordListener,
  mockServer: undefined as unknown as MockJellyfinServer,
};

describe.runIf(enabled)('Discord bot e2e', () => {
  beforeAll(async () => {
    vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

    // Fail fast on credential/connectivity issues instead of a generic boot timeout.
    await preflightDiscordToken(
      config.botToken,
      'Bot under test (DISCORD_CLIENT_TOKEN)',
    );
    await preflightDiscordToken(
      config.listenerToken,
      'Listener bot (E2E_LISTENER_TOKEN)',
    );

    e2e.mockServer = new MockJellyfinServer(
      melodies.map((melody, index) => ({
        id: PLAY_TRACK_IDS[index],
        audio: melody.oggOpus,
      })),
    );
    await e2e.mockServer.start();

    e2e.bot = await createBotUnderTest(config, e2e.mockServer.baseUrl);

    e2e.listener = new DiscordListener();
    await e2e.listener.login(config.listenerToken);
    await e2e.listener.joinVoiceChannel(config.guildId, config.voiceChannelId);
  }, 90_000);

  afterAll(async () => {
    // Leave the voice channel so neither bot lingers in it.
    if (e2e.bot) {
      e2e.bot.voiceService.leaveChannel();
    }
    await e2e.listener?.destroy();
    if (e2e.bot) {
      await e2e.bot.destroy();
    }
    await e2e.mockServer?.close();
  });

  describe('Discord connection', () => {
    it('logs into the Discord gateway and reaches the Ready state', () => {
      expect(e2e.bot.client.isReady()).toBe(true);
      expect(e2e.bot.client.ws.status).toBe(0);
    }, 15_000);

    it('joins the configured voice channel and the listener can see it', async () => {
      const guild = e2e.bot.client.guilds.cache.get(config.guildId);
      if (!guild) {
        throw new Error('bot should be a member of the configured guild');
      }

      const fetched = await guild.channels.fetch(config.voiceChannelId);
      const channel = fetched instanceof VoiceChannel ? fetched : undefined;
      if (!channel) {
        throw new Error(
          'configured voice channel should exist and be a voice channel',
        );
      }

      const botUser = e2e.bot.client.user;
      if (!botUser) {
        throw new Error('bot user is unavailable');
      }
      const botUserId = botUser.id;

      const seenJoin = e2e.listener.waitForBotVoiceState(botUserId, 10_000);

      e2e.bot.voiceService.joinChannel(
        config.guildId,
        config.voiceChannelId,
        channel.guild.voiceAdapterCreator,
      );

      const connection = getVoiceConnection(config.guildId);
      if (!connection) {
        throw new Error('bot should hold a voice connection');
      }
      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);

      await seenJoin;
    }, 30_000);
  });

  describe('Audio playback', () => {
    it('plays a playlist of three tracks via the app and the listener receives all of them without distortion', async () => {
      const botUser = e2e.bot.client.user;
      if (!botUser) {
        throw new Error('bot user is unavailable');
      }
      const botUserId = botUser.id;

      // Enqueue through the app's real auto-advance path (`AnnounceTrack` →
      // `DiscordVoiceService` → audio player -> next track).
      const tracks = PLAY_TRACK_IDS.map(
        (id, index) => new Track(id, `e2e melody ${index + 1}`, 2000),
      );
      const eventEmitter = e2e.bot.eventEmitter;
      let finishedTracks = 0;
      const onFinish = () => {
        finishedTracks += 1;
      };
      eventEmitter.on(EventNames.Circuit.FinishedTrack, onFinish);

      // 12s is a hard cap so a silent run fails fast instead of hanging.
      const recording = e2e.listener.startRecording(botUserId, 1000, 12_000);

      await new Promise((resolve) => setTimeout(resolve, 250));

      e2e.bot.playbackService.getPlaylistOrDefault().enqueueTracks(tracks);

      const result = await recording;

      const playlist = e2e.bot.playbackService.getPlaylistOrDefault();
      const trackComparisons = comparePlaylistTracks(melodies, result.pcm);

      // eslint-disable-next-line no-console
      console.log(
        'Audio comparison metrics (one per playlist track)',
        trackComparisons.map((c) => {
          const meta = c as AudioComparison & { offsetMs?: number };
          return {
            similarity: c.similarity.toFixed(4),
            errorRmsDb: c.errorRmsDb.toFixed(2),
            clicks: c.clicks,
            silenceRatio: c.silenceRatio.toFixed(4),
            offsetMs: meta.offsetMs,
          };
        }),
        {
          finishedTracks,
          activeTrackIndex: playlist.activeTrackIndex,
          receivedDurationMs: ((result.pcm.length / 48000) * 1000).toFixed(0),
        },
      );

      expect(
        result.frames.length,
        'the listener should have received Opus audio packets',
      ).toBeGreaterThan(0);

      // Discord reliably relays audio only after the first ~100-300ms of the
      // first track (while its SSRC/opus stream is established), so the first
      // track always arrives truncated. Enforce strict similarity on tracks 2/3;
      // on track 1 just require that audio was actually delivered.
      for (const [index, comparison] of trackComparisons.entries()) {
        if (index === 0) {
          expect(comparison.silenceRatio).toBeLessThan(0.5);
          expect(comparison.receivedDurationMs).toBeGreaterThan(1000);
          continue;
        }
        expect(
          comparison.failures,
          `track ${index + 1}: ${comparison.failures.join('\n') || 'ok'}`,
        ).toEqual([]);
      }

      expect(playlist.getLength()).toBe(3);
      expect(playlist.activeTrackIndex).toBe(2);

      eventEmitter.off(EventNames.Circuit.FinishedTrack, onFinish);
    }, 60_000);
  });
});

if (!enabled) {
  describe('Discord bot e2e', () => {
    it('skipped (not configured)', () => {
      // eslint-disable-next-line no-console
      console.warn(e2eConfigError(config));
    }, 5_000);
  });
}

/**
 * Compares each reference melody against its segment of the recording.
 *
 * Tracks auto-advance with no silence gap, so they're located by sliding a
 * TRIMMED reference (first ~200ms skipped) over the recording and taking the
 * best-correlated non-overlapping match per track. Trimming keeps the score
 * honest when Discord dropped the lead of the first track.
 */
function comparePlaylistTracks(
  refs: import('./helpers/e2e/audio-signal').ReferenceSignal[],
  received: Float32Array,
): AudioComparison[] {
  const LEAD_SKIP_MS = 0.2;
  const leadSkip = Math.round(LEAD_SKIP_MS * 48000);
  const results: AudioComparison[] = [];
  let searchFrom = 0;

  for (const ref of refs) {
    const expectedTrim = ref.pcm.subarray(leadSkip);
    const searchEnd = Math.min(
      received.length - expectedTrim.length,
      searchFrom + ref.pcm.length + Math.round(0.6 * 48000),
    );

    let bestOffset = searchFrom;
    let bestScore = -1;
    const step = 96; // 2ms sliding step
    for (let o = searchFrom; o <= searchEnd; o += step) {
      const score = pearsonCorrelation(
        expectedTrim,
        received.subarray(o, o + expectedTrim.length),
      );
      if (score > bestScore) {
        bestScore = score;
        bestOffset = o;
      }
    }

    const segmentEnd = Math.min(
      received.length,
      bestOffset + expectedTrim.length + Math.round(0.2 * 48000),
    );
    const comparison = compareAudio(
      expectedTrim,
      received.slice(bestOffset, segmentEnd),
    );
    (comparison as AudioComparison & { offsetMs?: number }).offsetMs =
      Math.round(bestOffset / 48);
    results.push(comparison);

    searchFrom = bestOffset + expectedTrim.length - leadSkip;
  }

  return results;
}
