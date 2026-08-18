/**
 * Audio comparison for the e2e playback tests.
 *
 * Discord audio is lossy (Opus + network relay), so we never compare bytes.
 * Instead we time-align the recording against the reference (via
 * cross-correlation, since latency is unpredictable), then measure similarity,
 * residual error, distortion "clicks" and dropouts. Thresholds are lenient so
 * normal Opus loss passes while genuine breakage (silence, wrong audio, severe
 * corruption) fails.
 */

import OpusScript from 'opusscript';

import { AUDIO_SAMPLE_RATE, FRAME_SIZE } from './audio-signal';

export interface AudioComparisonOptions {
  minSimilarity?: number;
  maxErrorRmsDb?: number;
  maxClickRatio?: number;
  maxSilenceRatio?: number;
  maxDurationDeltaRatio?: number;
}

export interface AudioComparison {
  success: boolean;
  similarity: number;
  errorRmsDb: number;
  clicks: number;
  clickRatio: number;
  silenceRatio: number;
  referenceDurationMs: number;
  receivedDurationMs: number;
  alignmentOffsetSamples: number;
  failures: string[];
}

export const DEFAULT_COMPARISON_OPTIONS: Required<AudioComparisonOptions> = {
  minSimilarity: 0.85,
  maxErrorRmsDb: -6,
  maxClickRatio: 0.001,
  maxSilenceRatio: 0.05,
  maxDurationDeltaRatio: 0.5,
};

/**
 * Compares a recorded mono PCM signal against a reference mono PCM signal.
 * Both are expected to be at {@link AUDIO_SAMPLE_RATE}.
 */
export function compareAudio(
  reference: Float32Array,
  received: Float32Array,
  options: AudioComparisonOptions = {},
): AudioComparison {
  const opts = { ...DEFAULT_COMPARISON_OPTIONS, ...options };
  const failures: string[] = [];

  const referenceDurationMs = (reference.length / AUDIO_SAMPLE_RATE) * 1000;
  const receivedDurationMs = (received.length / AUDIO_SAMPLE_RATE) * 1000;

  const durationDeltaRatio =
    Math.abs(referenceDurationMs - receivedDurationMs) / referenceDurationMs;
  if (durationDeltaRatio > opts.maxDurationDeltaRatio) {
    failures.push(
      `received duration (${receivedDurationMs.toFixed(
        0,
      )}ms) differs too much from reference (${referenceDurationMs.toFixed(
        0,
      )}ms)`,
    );
  }

  const alignmentOffsetSamples = findAlignmentOffset(reference, received);

  // Overlap region expressed in "reference time": received[i + offset] maps to reference[i].
  const refStart = findActiveStart(reference);
  const refEnd = findActiveEnd(reference);
  const overlapStart = Math.max(refStart, -alignmentOffsetSamples, 0);
  const overlapEnd = Math.min(refEnd, received.length - alignmentOffsetSamples);

  const windowLength = overlapEnd - overlapStart;
  if (windowLength < AUDIO_SAMPLE_RATE) {
    failures.push(
      `overlapping audio window too small (${windowLength} samples); is anything being played?`,
    );
    return buildResult(
      {
        similarity: 0,
        errorRmsDb: -Infinity,
        clicks: 0,
        clickRatio: 0,
        silenceRatio: 1,
        referenceDurationMs,
        receivedDurationMs,
        alignmentOffsetSamples,
      },
      failures,
    );
  }

  const refWindow = reference.subarray(overlapStart, overlapEnd);
  const recWindow = received.subarray(
    overlapStart + alignmentOffsetSamples,
    overlapEnd + alignmentOffsetSamples,
  );

  const similarity = pearsonCorrelation(refWindow, recWindow);
  if (similarity < opts.minSimilarity) {
    failures.push(
      `audio similarity ${similarity.toFixed(3)} is below the leniency threshold ${opts.minSimilarity}`,
    );
  }

  const refRms = rms(refWindow);
  const errRms = rmsDifference(refWindow, recWindow);
  const errorRmsDb = 20 * Math.log10(errRms / Math.max(refRms, 1e-9));
  if (errorRmsDb > opts.maxErrorRmsDb) {
    failures.push(
      `residual error (${errorRmsDb.toFixed(1)}dB) exceeds the leniency threshold ${opts.maxErrorRmsDb}dB`,
    );
  }

  const { clicks, clickRatio } = countClicks(refWindow, recWindow, refRms);
  if (clickRatio > opts.maxClickRatio) {
    failures.push(
      `detected ${clicks} distortion clicks (${(clickRatio * 100).toFixed(
        2,
      )}% of samples) which exceeds the threshold ${opts.maxClickRatio}`,
    );
  }

  const silenceRatio = countSilence(refWindow, recWindow);
  if (silenceRatio > opts.maxSilenceRatio) {
    failures.push(
      `recording is silent for ${(silenceRatio * 100).toFixed(
        1,
      )}% of the audio where it should be audible`,
    );
  }

  return buildResult(
    {
      similarity,
      errorRmsDb,
      clicks,
      clickRatio,
      silenceRatio,
      referenceDurationMs,
      receivedDurationMs,
      alignmentOffsetSamples,
    },
    failures,
  );
}

function buildResult(
  metrics: Omit<AudioComparison, 'success' | 'failures'>,
  failures: string[],
): AudioComparison {
  return {
    ...metrics,
    success: failures.length === 0,
    failures,
  };
}

/** Root mean square of a signal. */
function rms(signal: Float32Array): number {
  if (signal.length === 0) return 0;
  let sum = 0;
  for (const sample of signal) sum += sample * sample;
  return Math.sqrt(sum / signal.length);
}

/** Root mean square of `a - b`. */
function rmsDifference(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum / len);
}

/** Pearson correlation coefficient between two equally sized signals. */
export function pearsonCorrelation(a: Float32Array, b: Float32Array): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;

  let sumA = 0;
  let sumB = 0;
  let sumAA = 0;
  let sumBB = 0;
  let sumAB = 0;

  for (let i = 0; i < len; i++) {
    sumA += a[i];
    sumB += b[i];
    sumAA += a[i] * a[i];
    sumBB += b[i] * b[i];
    sumAB += a[i] * b[i];
  }

  const n = len;
  const numerator = n * sumAB - sumA * sumB;
  const denominator = Math.sqrt(
    (n * sumAA - sumA * sumA) * (n * sumBB - sumB * sumB),
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/** Index of the first sample whose absolute value exceeds `threshold`. */
function findActiveStart(signal: Float32Array, threshold = 0.02): number {
  for (let i = 0; i < signal.length; i++) {
    if (Math.abs(signal[i]) > threshold) return i;
  }
  return 0;
}

/** Index just past the last sample whose absolute value exceeds `threshold`. */
function findActiveEnd(signal: Float32Array, threshold = 0.02): number {
  for (let i = signal.length - 1; i >= 0; i--) {
    if (Math.abs(signal[i]) > threshold) return i + 1;
  }
  return signal.length;
}

/**
 * Finds the offset such that `received[i + offset] === reference[i]`. Onset
 * detection gives a coarse position, then cross-correlation refines it, skipping
 * the beacon tone (a pure tone has a periodic autocorrelation that makes
 * alignment ambiguous).
 */
function findAlignmentOffset(
  reference: Float32Array,
  received: Float32Array,
): number {
  const refStart = findActiveStart(reference);
  const recStart = findActiveStart(received);

  const coarseOffset = recStart - refStart;

  const beaconSamples = Math.round(0.3 * AUDIO_SAMPLE_RATE);
  const refIndex = Math.max(coarseOffset + beaconSamples, 0);
  const windowLength = Math.min(AUDIO_SAMPLE_RATE, reference.length - refIndex);

  if (windowLength <= 0) return coarseOffset;

  const radius = Math.round(0.05 * AUDIO_SAMPLE_RATE);
  let bestOffset = coarseOffset;
  let bestScore = -Infinity;

  for (let o = coarseOffset - radius; o <= coarseOffset + radius; o++) {
    const recStartIndex = refIndex + o;
    if (recStartIndex < 0 || recStartIndex + windowLength > received.length) {
      continue;
    }

    let score = 0;
    for (let k = 0; k < windowLength; k += 2) {
      score += reference[refIndex + k] * received[recStartIndex + k];
    }
    if (score > bestScore) {
      bestScore = score;
      bestOffset = o;
    }
  }

  return bestOffset;
}

/**
 * Counts distortion clicks: isolated samples where the residual spikes far
 * above the noise floor. Real clicks are sparse but large, whereas normal Opus
 * loss produces a low, distributed error.
 */
function countClicks(
  reference: Float32Array,
  received: Float32Array,
  refRms: number,
): { clicks: number; clickRatio: number } {
  const len = Math.min(reference.length, received.length);
  const clickThreshold = Math.max(0.25, refRms * 0.8);
  let clicks = 0;

  for (let i = 1; i < len - 1; i++) {
    const err = Math.abs(received[i] - reference[i]);
    if (err <= clickThreshold) continue;

    const prevErr = Math.abs(received[i - 1] - reference[i - 1]);
    const nextErr = Math.abs(received[i + 1] - reference[i + 1]);
    if (prevErr * 3 < err && nextErr * 3 < err) clicks++;
  }

  return { clicks, clickRatio: len > 0 ? clicks / len : 0 };
}

/** Fraction of the aligned window silent in the recording but audible in the reference. */
function countSilence(reference: Float32Array, received: Float32Array): number {
  const len = Math.min(reference.length, received.length);
  let signalSamples = 0;
  let silentSamples = 0;

  for (let i = 0; i < len; i++) {
    if (Math.abs(reference[i]) < 0.05) continue;
    signalSamples++;
    if (Math.abs(received[i]) < 0.02) silentSamples++;
  }

  return signalSamples > 0 ? silentSamples / signalSamples : 0;
}

/**
 * Decodes recorded Opus packets into mono PCM in [-1, 1], distinguishing stereo
 * (what @discordjs/voice transmits) from mono by packet rate.
 */
export function decodeOpusFrames(
  frames: Buffer[],
  channels: 1 | 2 = 2,
): Float32Array {
  if (frames.length === 0) return new Float32Array(0);

  const decoder = new OpusScript(AUDIO_SAMPLE_RATE, channels);
  const pcm = new Float32Array(frames.length * FRAME_SIZE);
  let offset = 0;

  for (const frame of frames) {
    const decoded = decoder.decode(frame);
    const count = Math.min(FRAME_SIZE, pcm.length - offset);

    if (channels === 1) {
      for (let i = 0; i < count; i++) {
        pcm[offset + i] = decoded.readInt16LE(i * 2) / 32768;
      }
    } else {
      for (let i = 0; i < count; i++) {
        const left = decoded.readInt16LE(i * 4) / 32768;
        const right = decoded.readInt16LE(i * 4 + 2) / 32768;
        pcm[offset + i] = (left + right) / 2;
      }
    }

    offset += count;
  }

  return pcm;
}

/** Decodes a recording, auto-detecting stereo vs mono. */
export function decodeRecording(frames: Buffer[]): Float32Array {
  if (frames.length === 0) return new Float32Array(0);

  const stereo = decodeOpusFrames(frames, 2);
  const stereoSamplesPerFrame = stereo.length / frames.length;
  const isStereo = stereoSamplesPerFrame >= FRAME_SIZE * 1.5;

  return isStereo ? stereo : decodeOpusFrames(frames, 1);
}
