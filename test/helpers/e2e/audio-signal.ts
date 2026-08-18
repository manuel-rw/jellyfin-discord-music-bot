/**
 * Reference audio signal generation for the e2e playback tests.
 *
 * The mock Jellyfin server streams the signal as Ogg/Opus, matching a real
 * Jellyfin instance: `@discordjs/voice` demuxes Ogg/Opus natively but cannot
 * play a WAV directly, so a WAV would make the bot's resource non-playable.
 *
 * Audio is never lossless (Opus + Discord relay); comparison applies leniency
 * instead of an exact match (see `audio-analysis.ts`).
 */
import { spawnSync } from 'child_process';

export const AUDIO_SAMPLE_RATE = 48000;

/** 20ms frame size used by @discordjs/voice at 48kHz. */
export const FRAME_SIZE = AUDIO_SAMPLE_RATE / 50;

export interface ReferenceSignal {
  /** Mono PCM samples in [-1, 1] at {@link AUDIO_SAMPLE_RATE}. */
  pcm: Float32Array;
  /** 16-bit mono WAV. */
  wav: Buffer;
  /** Ogg/Opus-encoded signal, which @discordjs/voice can play directly. */
  oggOpus: Buffer;
  durationMs: number;
}

export interface ReferenceSignalOptions {
  durationSeconds?: number;
  amplitude?: number;
  beaconSeconds?: number;
}

/**
 * Generates a deterministic reference signal: a short fixed-frequency beacon
 * followed by a linear frequency sweep. Chirps have a sharp cross-correlation
 * peak, which makes time-alignment robust and is a sensitive probe for
 * distortion. This is the technical signal; {@link generateMelodySignal} is the
 * human-audible one for the playlist tests.
 */
export function generateReferenceSignal(
  options: ReferenceSignalOptions = {},
): ReferenceSignal {
  const {
    durationSeconds = 6,
    amplitude = 0.6,
    beaconSeconds = 0.25,
  } = options;

  const totalSamples = Math.round(durationSeconds * AUDIO_SAMPLE_RATE);
  const beaconSamples = Math.round(beaconSeconds * AUDIO_SAMPLE_RATE);
  const sweepDurationSeconds = durationSeconds - beaconSeconds;

  const startHz = 220;
  const endHz = 2200;

  const pcm = new Float32Array(totalSamples);
  let phase = 0;

  for (let i = 0; i < totalSamples; i++) {
    const timeSeconds = i / AUDIO_SAMPLE_RATE;

    if (i < beaconSamples) {
      pcm[i] = amplitude * Math.sin(2 * Math.PI * 440 * timeSeconds);
      continue;
    }

    const sweepProgress = (timeSeconds - beaconSeconds) / sweepDurationSeconds;
    const frequency = startHz + (endHz - startHz) * sweepProgress;

    phase += (2 * Math.PI * frequency) / AUDIO_SAMPLE_RATE;
    pcm[i] = amplitude * Math.sin(phase);
  }

  const wav = float32ToWav(pcm);

  return {
    pcm,
    wav,
    oggOpus: encodeWavToOggOpus(wav),
    durationMs: durationSeconds * 1000,
  };
}

/** Encodes a WAV into 48kHz stereo Ogg/Opus using the `ffmpeg` binary. */
export function encodeWavToOggOpus(wav: Buffer): Buffer {
  const result = spawnSync(
    'ffmpeg',
    [
      '-loglevel',
      'error',
      '-i',
      'pipe:0',
      '-ac',
      '2',
      '-ar',
      '48000',
      '-c:a',
      'libopus',
      '-f',
      'ogg',
      'pipe:1',
    ],
    { input: wav, maxBuffer: 64 * 1024 * 1024 },
  );

  if (result.status !== 0 || result.error) {
    throw new Error(
      `ffmpeg failed to encode Ogg/Opus: ${result.error?.message ?? ''} ${result.stderr?.toString() ?? ''}`,
    );
  }

  return result.stdout;
}

export interface MelodySignalOptions {
  durationSeconds?: number;
  amplitude?: number;
  noteSeconds?: number;
  /** Note frequencies in Hz, played in a loop. */
  notes?: number[];
}

/**
 * Generates a human-audible melody (an original little jingle) from sine notes
 * with a soft attack/release envelope per note so there are no clicks. Pleasant
 * to listen to in a voice channel while staying a deterministic reference.
 */
export function generateMelodySignal(
  options: MelodySignalOptions = {},
): ReferenceSignal {
  const {
    amplitude = 0.45,
    noteSeconds = 0.5,
    notes = [523.25, 659.25, 783.99, 880, 1046.5], // C5 E5 G5 A5 C6
  } = options;

  const noteLength = Math.round(noteSeconds * AUDIO_SAMPLE_RATE);
  const totalSamples = Math.max(
    Math.round(
      (options.durationSeconds ?? notes.length * noteSeconds) *
        AUDIO_SAMPLE_RATE,
    ),
    noteLength * notes.length,
  );

  const attackSamples = Math.round(0.015 * AUDIO_SAMPLE_RATE);
  const releaseSamples = Math.round(0.03 * AUDIO_SAMPLE_RATE);
  const pcm = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const noteIndex = Math.floor(i / noteLength);
    const withinNote = i % noteLength;
    const frequency = notes[noteIndex % notes.length];

    const attack = Math.min(1, withinNote / attackSamples);
    const release = Math.min(1, (noteLength - withinNote) / releaseSamples);

    const phase = (2 * Math.PI * frequency * i) / AUDIO_SAMPLE_RATE;
    let sample = amplitude * Math.sin(phase);
    sample += amplitude * 0.3 * Math.sin(2 * phase); // softer octave for warmth

    pcm[i] = sample * attack * release;
  }

  const wav = float32ToWav(pcm);
  return {
    pcm,
    wav,
    oggOpus: encodeWavToOggOpus(wav),
    durationMs: (totalSamples / AUDIO_SAMPLE_RATE) * 1000,
  };
}

/** Concatenates mono PCM signals into a single mono PCM array. */
export function concatPcm(signals: Float32Array[]): Float32Array {
  const total = signals.reduce((sum, s) => sum + s.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const s of signals) {
    out.set(s, offset);
    offset += s.length;
  }
  return out;
}

/** Encodes mono Float32 PCM samples into a 16-bit PCM WAV buffer. */
export function float32ToWav(
  pcm: Float32Array,
  sampleRate: number = AUDIO_SAMPLE_RATE,
): Buffer {
  const dataSize = pcm.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample

  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < pcm.length; i++) {
    const clamped = Math.max(-1, Math.min(1, pcm[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  return buffer;
}
