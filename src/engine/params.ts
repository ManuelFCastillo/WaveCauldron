import type { Layer, NumericLayerKey, ParamSpec, Recipe, Waveform, FilterType } from './types.js';

export const WAVEFORMS: Waveform[] = [
  'sine',
  'square',
  'sawtooth',
  'triangle',
  'white',
  'pink',
  'brown',
];

export const FILTER_TYPES: FilterType[] = ['none', 'lowpass', 'highpass', 'bandpass'];

export function isNoise(waveform: Waveform): boolean {
  return waveform === 'white' || waveform === 'pink' || waveform === 'brown';
}

/**
 * Single source of truth for every numeric layer parameter: its range, how the
 * UI should display it, and how `mutate` should perturb it.
 */
export const LAYER_PARAMS: ParamSpec[] = [
  { key: 'gain', label: 'Gain', min: 0, max: 1, step: 0.01, group: 'mix' },
  { key: 'delay', label: 'Delay', min: 0, max: 2, step: 0.005, unit: 's', group: 'mix' },

  { key: 'frequency', label: 'Pitch start', min: 20, max: 8000, step: 1, unit: 'Hz', log: true, group: 'pitch' },
  { key: 'frequencyEnd', label: 'Pitch end', min: 20, max: 8000, step: 1, unit: 'Hz', log: true, group: 'pitch' },
  { key: 'vibratoRate', label: 'Vibrato rate', min: 0, max: 40, step: 0.1, unit: 'Hz', group: 'pitch' },
  { key: 'vibratoDepth', label: 'Vibrato depth', min: 0, max: 12, step: 0.05, unit: 'st', group: 'pitch' },
  { key: 'duty', label: 'Pulse width', min: 0.05, max: 0.95, step: 0.01, group: 'pitch' },

  { key: 'attack', label: 'Attack', min: 0, max: 1, step: 0.001, unit: 's', group: 'envelope' },
  { key: 'hold', label: 'Hold', min: 0, max: 2, step: 0.001, unit: 's', group: 'envelope' },
  { key: 'release', label: 'Release', min: 0, max: 3, step: 0.001, unit: 's', group: 'envelope' },

  { key: 'filterCutoff', label: 'Cutoff start', min: 40, max: 18000, step: 1, unit: 'Hz', log: true, group: 'filter' },
  { key: 'filterCutoffEnd', label: 'Cutoff end', min: 40, max: 18000, step: 1, unit: 'Hz', log: true, group: 'filter' },
  { key: 'filterQ', label: 'Resonance', min: 0.3, max: 12, step: 0.05, group: 'filter' },

  { key: 'distortion', label: 'Distortion', min: 0, max: 1, step: 0.01, group: 'effects' },
  { key: 'bitcrush', label: 'Bitcrush', min: 0, max: 1, step: 0.01, group: 'effects' },
];

export const PARAM_BY_KEY: Record<NumericLayerKey, ParamSpec> = Object.fromEntries(
  LAYER_PARAMS.map((p) => [p.key, p]),
) as Record<NumericLayerKey, ParamSpec>;

let idCounter = 0;
export function newLayerId(): string {
  idCounter += 1;
  return `L${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export function defaultLayer(overrides: Partial<Layer> = {}): Layer {
  return {
    id: newLayerId(),
    name: 'Layer',
    enabled: true,
    waveform: 'sine',
    gain: 0.8,
    delay: 0,
    frequency: 440,
    frequencyEnd: 440,
    vibratoRate: 0,
    vibratoDepth: 0,
    duty: 0.5,
    attack: 0.005,
    hold: 0.1,
    release: 0.2,
    filterType: 'none',
    filterCutoff: 8000,
    filterCutoffEnd: 8000,
    filterQ: 0.7,
    distortion: 0,
    bitcrush: 0,
    ...overrides,
  };
}

export function defaultRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    version: 1,
    name: 'Untitled brew',
    seed: 1,
    masterGain: 0.8,
    normalize: true,
    reverb: { amount: 0, size: 1 },
    echo: { amount: 0, time: 0.25, feedback: 0.3 },
    layers: [],
    ...overrides,
  };
}

export function clampParam(key: NumericLayerKey, value: number): number {
  const spec = PARAM_BY_KEY[key];
  if (!Number.isFinite(value)) return spec.min;
  return Math.min(spec.max, Math.max(spec.min, value));
}

/** Total length of a layer's envelope (not including its start delay). */
export function layerDuration(layer: Layer): number {
  return layer.attack + layer.hold + layer.release;
}

/** Length of the whole sound: the longest layer plus any effect tails. */
export function recipeDuration(recipe: Recipe): number {
  let end = 0;
  for (const layer of recipe.layers) {
    if (!layer.enabled) continue;
    end = Math.max(end, layer.delay + layerDuration(layer));
  }
  if (recipe.reverb.amount > 0) end += recipe.reverb.size;
  if (recipe.echo.amount > 0) {
    // Roughly how long until feedback has decayed below -60 dB.
    const repeats = recipe.echo.feedback > 0 ? Math.log(0.001) / Math.log(recipe.echo.feedback) : 1;
    end += recipe.echo.time * Math.min(repeats, 12);
  }
  return end;
}
