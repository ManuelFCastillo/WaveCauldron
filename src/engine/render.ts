/**
 * The renderer: turns a Recipe into a mono Float32Array of samples. It is pure
 * and deterministic, so the same recipe always yields the same buffer.
 */
import type { Layer, Recipe } from './types.js';
import { createRng } from './random.js';
import { isNoise, layerDuration, recipeDuration } from './params.js';
import {
  Biquad,
  applyEcho,
  applyReverb,
  bitcrush,
  brownNoise,
  peak,
  pinkNoise,
  sawtooth,
  sine,
  softClip,
  square,
  triangle,
  whiteNoise,
  type NoiseSource,
} from './dsp.js';

export const DEFAULT_SAMPLE_RATE = 44100;
/** Hard cap so a runaway recipe can't allocate gigabytes. */
export const MAX_DURATION_SECONDS = 12;
const FILTER_BLOCK = 32;

export interface RenderOptions {
  sampleRate?: number;
}

export function renderRecipe(recipe: Recipe, options: RenderOptions = {}): Float32Array {
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const duration = Math.min(recipeDuration(recipe), MAX_DURATION_SECONDS);
  const totalSamples = Math.max(1, Math.ceil(duration * sampleRate));
  const mix = new Float32Array(totalSamples);

  recipe.layers.forEach((layer, index) => {
    if (!layer.enabled || layer.gain <= 0) return;
    // Each layer gets its own stream derived from the recipe seed so that
    // editing one layer never changes the noise of another.
    const rng = createRng((recipe.seed ^ (index + 1) * 0x9e3779b9) >>> 0);
    const start = Math.round(layer.delay * sampleRate);
    if (start >= totalSamples) return;
    renderLayer(layer, sampleRate, rng, mix, start);
  });

  applyEcho(mix, sampleRate, recipe.echo.time, recipe.echo.feedback, recipe.echo.amount);
  applyReverb(mix, sampleRate, recipe.reverb.size, recipe.reverb.amount);

  let gain = recipe.masterGain;
  if (recipe.normalize) {
    const p = peak(mix);
    if (p > 0) gain *= 0.89 / p; // -1 dBFS
  }
  for (let i = 0; i < mix.length; i++) {
    // Final safety clip for the non-normalized case.
    const v = mix[i] * gain;
    mix[i] = v > 1 ? 1 : v < -1 ? -1 : v;
  }
  return mix;
}

function renderLayer(
  layer: Layer,
  sampleRate: number,
  rng: ReturnType<typeof createRng>,
  out: Float32Array,
  start: number,
): void {
  const dur = layerDuration(layer);
  const n = Math.min(Math.ceil(dur * sampleRate), out.length - start);
  if (n <= 0) return;

  const noise = isNoise(layer.waveform) ? makeNoise(layer.waveform, rng) : null;
  const f0 = Math.max(layer.frequency, 1);
  const f1 = Math.max(layer.frequencyEnd, 1);
  const pitchRatio = f1 / f0;
  const c0 = Math.max(layer.filterCutoff, 10);
  const c1 = Math.max(layer.filterCutoffEnd, 10);
  const cutoffRatio = c1 / c0;
  const filter = layer.filterType === 'none' ? null : new Biquad(sampleRate);

  const attackSamples = layer.attack * sampleRate;
  const holdEnd = (layer.attack + layer.hold) * sampleRate;
  const releaseSamples = layer.release * sampleRate;

  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n; // normalised position through the layer, 0..1

    // --- envelope ---
    let env: number;
    if (i < attackSamples) env = i / attackSamples;
    else if (i < holdEnd) env = 1;
    else {
      env = releaseSamples > 0 ? 1 - (i - holdEnd) / releaseSamples : 0;
      if (env <= 0) break;
    }
    // Slight curve so releases sound natural rather than linear.
    env = env * env;

    // --- source ---
    let sample: number;
    if (noise) {
      sample = noise.next();
    } else {
      let freq = f0 * Math.pow(pitchRatio, t);
      if (layer.vibratoRate > 0 && layer.vibratoDepth > 0) {
        const lfo = Math.sin((2 * Math.PI * layer.vibratoRate * i) / sampleRate);
        freq *= Math.pow(2, (lfo * layer.vibratoDepth) / 12);
      }
      phase += freq / sampleRate;
      if (phase >= 1) phase -= Math.floor(phase);
      switch (layer.waveform) {
        case 'sine': sample = sine(phase); break;
        case 'square': sample = square(phase, layer.duty); break;
        case 'sawtooth': sample = sawtooth(phase); break;
        case 'triangle': sample = triangle(phase); break;
        default: sample = 0;
      }
    }

    // --- filter ---
    if (filter) {
      if (i % FILTER_BLOCK === 0) {
        filter.set(layer.filterType, c0 * Math.pow(cutoffRatio, t), layer.filterQ);
      }
      sample = filter.process(sample);
    }

    // --- per-layer effects ---
    if (layer.distortion > 0) sample = softClip(sample, layer.distortion);
    if (layer.bitcrush > 0) sample = bitcrush(sample, layer.bitcrush);

    out[start + i] += sample * env * layer.gain;
  }
}

function makeNoise(kind: Layer['waveform'], rng: ReturnType<typeof createRng>): NoiseSource {
  switch (kind) {
    case 'pink': return pinkNoise(rng);
    case 'brown': return brownNoise(rng);
    default: return whiteNoise(rng);
  }
}
