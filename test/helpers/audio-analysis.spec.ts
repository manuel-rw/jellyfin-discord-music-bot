import { describe, expect, it } from 'vitest';

import { compareAudio, DEFAULT_COMPARISON_OPTIONS } from './e2e/audio-analysis';

const SAMPLE_RATE = 48000;
const DURATION_S = 3;
const referencePcm = buildChirp(DURATION_S);

function buildChirp(durationSeconds: number): Float32Array {
  const length = Math.round(durationSeconds * SAMPLE_RATE);
  const startHz = 220;
  const endHz = 2200;
  const pcm = new Float32Array(length);
  let phase = 0;
  for (let i = 0; i < length; i++) {
    const frequency = startHz + ((endHz - startHz) * i) / length;
    phase += (2 * Math.PI * frequency) / SAMPLE_RATE;
    pcm[i] = 0.6 * Math.sin(phase);
  }
  return pcm;
}

function zeros(samples: number): Float32Array {
  return new Float32Array(samples);
}

function delay(signal: Float32Array, delaySeconds: number): Float32Array {
  const out = zeros(Math.round(delaySeconds * SAMPLE_RATE) + signal.length);
  out.set(signal, Math.round(delaySeconds * SAMPLE_RATE));
  return out;
}

function addNoise(signal: Float32Array, amount: number): Float32Array {
  const out = new Float32Array(signal.length);
  for (let i = 0; i < signal.length; i++) {
    out[i] = signal[i] + (Math.random() - 0.5) * 2 * amount;
  }
  return out;
}

describe('audio-analysis', () => {
  it('treats an identical signal as a match', () => {
    const result = compareAudio(referencePcm, referencePcm);
    expect(result.success).toBe(true);
    expect(result.similarity).toBeGreaterThan(0.99);
    expect(result.failures).toEqual([]);
  });

  it('aligns and matches a signal delayed by network-like latency', () => {
    const received = delay(referencePcm, 0.15);
    const result = compareAudio(referencePcm, received);

    expect(Math.abs(result.alignmentOffsetSamples)).toBeGreaterThan(6000);
    expect(Math.abs(result.alignmentOffsetSamples)).toBeLessThan(8500);
    expect(result.similarity).toBeGreaterThan(0.99);
    expect(result.success).toBe(true);
  });

  it('matches a lossy signal within leniency', () => {
    const lossy = addNoise(referencePcm, 0.02);
    for (let i = 0; i < lossy.length; i++) lossy[i] *= 0.95;

    const result = compareAudio(referencePcm, lossy);
    expect(result.similarity).toBeGreaterThan(
      DEFAULT_COMPARISON_OPTIONS.minSimilarity,
    );
    expect(result.success).toBe(true);
  });

  it('rejects a completely different signal', () => {
    const noise = new Float32Array(referencePcm.length);
    for (let i = 0; i < noise.length; i++) noise[i] = Math.random() * 2 - 1;

    const result = compareAudio(referencePcm, noise);
    expect(result.success).toBe(false);
    expect(result.similarity).toBeLessThan(
      DEFAULT_COMPARISON_OPTIONS.minSimilarity,
    );
  });

  it('rejects a silent (dropped) stream', () => {
    const result = compareAudio(referencePcm, zeros(referencePcm.length));
    expect(result.success).toBe(false);
    expect(result.silenceRatio).toBeGreaterThan(0.9);
  });

  it('detects distortion clicks', () => {
    const corrupted = new Float32Array(referencePcm);
    for (const i of [1000, 5000, 12000, 80000]) {
      corrupted[i] = 1;
    }

    const result = compareAudio(referencePcm, corrupted);
    expect(result.clicks).toBeGreaterThanOrEqual(4);
  });

  it('detects an implausible duration mismatch', () => {
    const tooShort = referencePcm.subarray(0, SAMPLE_RATE);
    const result = compareAudio(referencePcm, new Float32Array(tooShort));
    expect(result.success).toBe(false);
    expect(result.failures.join(' ')).toContain('duration');
  });
});
