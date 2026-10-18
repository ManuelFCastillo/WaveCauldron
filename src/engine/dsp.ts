/**
 * Low-level building blocks used by the renderer. Everything here is plain
 * sample math over Float32Arrays so it runs identically in the browser, in
 * Node (CLI export) and in tests.
 */
import type { FilterType } from './types';
import type { Rng } from './random';

// ---------------------------------------------------------------------------
// Noise sources
// ---------------------------------------------------------------------------

export interface NoiseSource {
  next(): number;
}

export function whiteNoise(rng: Rng): NoiseSource {
  return { next: () => rng.next() * 2 - 1 };
}

/** Pink noise via Paul Kellet's economical filter approximation. */
export function pinkNoise(rng: Rng): NoiseSource {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  return {
    next: () => {
      const white = rng.next() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      const out = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      return out * 0.11;
    },
  };
}

/** Brown (red) noise: leaky integration of white noise. */
export function brownNoise(rng: Rng): NoiseSource {
  let last = 0;
  return {
    next: () => {
      const white = rng.next() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      return last * 3.5;
    },
  };
}

// ---------------------------------------------------------------------------
// Oscillator waveshapes (phase in [0, 1))
// ---------------------------------------------------------------------------

export function sine(phase: number): number {
  return Math.sin(phase * 2 * Math.PI);
}

export function square(phase: number, duty: number): number {
  return phase < duty ? 1 : -1;
}

export function sawtooth(phase: number): number {
  return 2 * phase - 1;
}

export function triangle(phase: number): number {
  return 1 - 4 * Math.abs(phase - 0.5);
}

// ---------------------------------------------------------------------------
// Biquad filter (RBJ cookbook), coefficients recomputed per block so that
// cutoff sweeps stay smooth and stable.
// ---------------------------------------------------------------------------

export class Biquad {
  private b0 = 1; private b1 = 0; private b2 = 0; private a1 = 0; private a2 = 0;
  private x1 = 0; private x2 = 0; private y1 = 0; private y2 = 0;

  constructor(private readonly sampleRate: number) {}

  set(type: FilterType, cutoff: number, q: number): void {
    if (type === 'none') {
      this.b0 = 1; this.b1 = 0; this.b2 = 0; this.a1 = 0; this.a2 = 0;
      return;
    }
    const fc = Math.min(Math.max(cutoff, 10), this.sampleRate * 0.45);
    const w0 = (2 * Math.PI * fc) / this.sampleRate;
    const cosW = Math.cos(w0);
    const sinW = Math.sin(w0);
    const alpha = sinW / (2 * Math.max(q, 0.1));
    let b0: number, b1: number, b2: number;
    switch (type) {
      case 'lowpass':
        b0 = (1 - cosW) / 2; b1 = 1 - cosW; b2 = (1 - cosW) / 2;
        break;
      case 'highpass':
        b0 = (1 + cosW) / 2; b1 = -(1 + cosW); b2 = (1 + cosW) / 2;
        break;
      case 'bandpass':
        b0 = alpha; b1 = 0; b2 = -alpha;
        break;
    }
    const a0 = 1 + alpha;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
    this.a1 = (-2 * cosW) / a0; this.a2 = (1 - alpha) / a0;
  }

  process(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x;
    this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

// ---------------------------------------------------------------------------
// Waveshaping
// ---------------------------------------------------------------------------

/** Symmetric soft clip. drive 0 is clean, 1 is heavily saturated. */
export function softClip(x: number, drive: number): number {
  if (drive <= 0) return x;
  const k = 1 + drive * 24;
  return Math.tanh(x * k) / Math.tanh(k);
}

/** Reduce bit depth. amount 0 leaves the signal alone, 1 quantises to 2 bits. */
export function bitcrush(x: number, amount: number): number {
  if (amount <= 0) return x;
  const bits = 16 - amount * 14;
  const steps = 2 ** bits;
  return Math.round(x * steps) / steps;
}

// ---------------------------------------------------------------------------
// Global effects: these operate on a whole buffer in place.
// ---------------------------------------------------------------------------

export function applyEcho(
  buffer: Float32Array,
  sampleRate: number,
  time: number,
  feedback: number,
  amount: number,
): void {
  if (amount <= 0 || time <= 0) return;
  const delaySamples = Math.max(1, Math.round(time * sampleRate));
  const line = new Float32Array(delaySamples);
  const fb = Math.min(feedback, 0.95);
  let pos = 0;
  for (let i = 0; i < buffer.length; i++) {
    const delayed = line[pos];
    const dry = buffer[i];
    line[pos] = dry + delayed * fb;
    buffer[i] = dry + delayed * amount;
    pos = (pos + 1) % delaySamples;
  }
}

/**
 * Small Schroeder reverb: four parallel feedback combs into two series
 * allpasses. `size` controls the comb feedback so the tail lasts roughly
 * `size` seconds.
 */
export function applyReverb(
  buffer: Float32Array,
  sampleRate: number,
  size: number,
  amount: number,
): void {
  if (amount <= 0) return;
  const combDelaysMs = [29.7, 37.1, 41.1, 43.7];
  const combs = combDelaysMs.map((ms) => {
    const len = Math.max(1, Math.round((ms / 1000) * sampleRate));
    // Feedback such that the tail decays by 60 dB over `size` seconds.
    const g = Math.min(0.98, 10 ** ((-3 * (len / sampleRate)) / Math.max(size, 0.05)));
    return { line: new Float32Array(len), pos: 0, g, damp: 0 };
  });
  const allpasses = [5.0, 1.7].map((ms) => {
    const len = Math.max(1, Math.round((ms / 1000) * sampleRate));
    return { line: new Float32Array(len), pos: 0, g: 0.7 };
  });
  const damping = 0.25;

  for (let i = 0; i < buffer.length; i++) {
    const input = buffer[i];
    let wet = 0;
    for (const c of combs) {
      const out = c.line[c.pos];
      // One-pole lowpass in the feedback path makes the tail darker as it decays.
      c.damp = out * (1 - damping) + c.damp * damping;
      c.line[c.pos] = input + c.damp * c.g;
      c.pos = (c.pos + 1) % c.line.length;
      wet += out;
    }
    wet *= 0.25;
    for (const ap of allpasses) {
      const delayed = ap.line[ap.pos];
      const v = wet + delayed * ap.g;
      ap.line[ap.pos] = v;
      ap.pos = (ap.pos + 1) % ap.line.length;
      wet = delayed - v * ap.g;
    }
    buffer[i] = input * (1 - amount * 0.5) + wet * amount;
  }
}

export function peak(buffer: Float32Array): number {
  let p = 0;
  for (let i = 0; i < buffer.length; i++) {
    const a = Math.abs(buffer[i]);
    if (a > p) p = a;
  }
  return p;
}
