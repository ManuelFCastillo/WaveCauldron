/**
 * Core data model for WaveCauldron.
 *
 * A Recipe is a complete, self-contained description of a sound: a handful of
 * Layers (each a single synthesized voice) plus global effects. Recipes are
 * plain JSON so they can be saved, shared, diffed and version-controlled.
 */

export type Waveform =
  | 'sine'
  | 'square'
  | 'sawtooth'
  | 'triangle'
  | 'white'
  | 'pink'
  | 'brown';

export type FilterType = 'none' | 'lowpass' | 'highpass' | 'bandpass';

export interface Layer {
  id: string;
  name: string;
  enabled: boolean;
  waveform: Waveform;

  /** Linear gain, 0..1. */
  gain: number;
  /** Seconds before this layer starts, relative to the start of the sound. */
  delay: number;

  /** Start frequency in Hz (ignored for noise waveforms). */
  frequency: number;
  /** End frequency in Hz; the pitch glides exponentially from `frequency`. */
  frequencyEnd: number;
  /** Vibrato rate in Hz; 0 disables vibrato. */
  vibratoRate: number;
  /** Vibrato depth in semitones. */
  vibratoDepth: number;
  /** Pulse width for the square waveform, 0..1. */
  duty: number;

  /** Attack / hold / release envelope, in seconds. */
  attack: number;
  hold: number;
  release: number;

  filterType: FilterType;
  /** Filter cutoff in Hz at the start of the layer. */
  filterCutoff: number;
  /** Filter cutoff in Hz at the end of the layer (exponential sweep). */
  filterCutoffEnd: number;
  /** Filter resonance (Q). */
  filterQ: number;

  /** Soft-clip drive, 0..1. */
  distortion: number;
  /** Bit depth reduction, 0..1 (0 = clean 16-bit, 1 = 2-bit crunch). */
  bitcrush: number;
}

export interface ReverbSettings {
  /** Wet mix, 0..1. */
  amount: number;
  /** Approximate tail length in seconds. */
  size: number;
}

export interface EchoSettings {
  /** Wet mix, 0..1. */
  amount: number;
  /** Delay time in seconds. */
  time: number;
  /** Feedback, 0..1. */
  feedback: number;
}

export interface Recipe {
  version: 1;
  name: string;
  /** Seed for every random element of the render (noise). Same seed, same sound. */
  seed: number;
  /** Master gain, 0..1. */
  masterGain: number;
  /** Normalize the peak of the final mix to -1 dBFS. */
  normalize: boolean;
  reverb: ReverbSettings;
  echo: EchoSettings;
  layers: Layer[];
}

/** Numeric layer fields that the UI exposes as sliders and that `mutate` nudges. */
export type NumericLayerKey = {
  [K in keyof Layer]: Layer[K] extends number ? K : never;
}[keyof Layer];

export interface ParamSpec {
  key: NumericLayerKey;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  /** Use a logarithmic slider / multiplicative mutation (frequencies, cutoffs). */
  log?: boolean;
  group: 'pitch' | 'envelope' | 'filter' | 'effects' | 'mix';
}
