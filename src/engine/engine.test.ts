import { describe, expect, it } from 'vitest';
import {
  LAYER_PARAMS,
  PRESETS,
  decodeRecipeFromUrl,
  defaultLayer,
  defaultRecipe,
  encodeRecipeForUrl,
  encodeWav,
  mutateRecipe,
  parseRecipe,
  recipeDuration,
  renderRecipe,
} from './index.js';

const SR = 22050;

describe('renderRecipe', () => {
  it('is deterministic for the same recipe and seed', () => {
    const recipe = PRESETS[0].recipe;
    const a = renderRecipe(recipe, { sampleRate: SR });
    const b = renderRecipe(recipe, { sampleRate: SR });
    expect(a.length).toBe(b.length);
    expect(Array.from(a.slice(0, 2000))).toEqual(Array.from(b.slice(0, 2000)));
  });

  it('changes noise when the seed changes', () => {
    const recipe = defaultRecipe({
      layers: [defaultLayer({ waveform: 'white', attack: 0, hold: 0.05, release: 0.05 })],
    });
    const a = renderRecipe({ ...recipe, seed: 1 }, { sampleRate: SR });
    const b = renderRecipe({ ...recipe, seed: 2 }, { sampleRate: SR });
    expect(Array.from(a.slice(0, 100))).not.toEqual(Array.from(b.slice(0, 100)));
  });

  it('renders every preset without NaNs and within [-1, 1]', () => {
    for (const preset of PRESETS) {
      const out = renderRecipe(preset.recipe, { sampleRate: SR });
      expect(out.length).toBeGreaterThan(SR * 0.01);
      let peak = 0;
      for (let i = 0; i < out.length; i++) {
        expect(Number.isNaN(out[i]), `${preset.name} sample ${i} is NaN`).toBe(false);
        peak = Math.max(peak, Math.abs(out[i]));
      }
      expect(peak, `${preset.name} is silent`).toBeGreaterThan(0.1);
      expect(peak, `${preset.name} clips`).toBeLessThanOrEqual(1);
    }
  });

  it('honours layer delay and envelope length', () => {
    const recipe = defaultRecipe({
      normalize: false,
      layers: [defaultLayer({ waveform: 'sine', delay: 0.1, attack: 0, hold: 0.1, release: 0 })],
    });
    expect(recipeDuration(recipe)).toBeCloseTo(0.2);
    const out = renderRecipe(recipe, { sampleRate: SR });
    expect(out.length).toBe(Math.ceil(0.2 * SR));
    // Silent before the delay, audible after.
    expect(Math.max(...Array.from(out.slice(0, Math.floor(0.09 * SR))))).toBe(0);
    expect(Math.max(...Array.from(out.slice(Math.floor(0.11 * SR), Math.floor(0.19 * SR))))).toBeGreaterThan(0.5);
  });

  it('normalizes the peak to roughly -1 dBFS', () => {
    const recipe = defaultRecipe({
      layers: [defaultLayer({ gain: 0.05, attack: 0, hold: 0.05, release: 0.05 })],
    });
    const out = renderRecipe(recipe, { sampleRate: SR });
    const peak = Math.max(...Array.from(out).map(Math.abs));
    expect(peak).toBeGreaterThan(0.6);
    expect(peak).toBeLessThanOrEqual(0.9);
  });

  it('renders an empty recipe as a single silent sample', () => {
    const out = renderRecipe(defaultRecipe(), { sampleRate: SR });
    expect(out.length).toBe(1);
    expect(out[0]).toBe(0);
  });
});

describe('encodeWav', () => {
  it('writes a valid RIFF header and 16-bit samples', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const buf = encodeWav(samples, 44100);
    const view = new DataView(buf);
    const ascii = (o: number, n: number) => String.fromCharCode(...new Uint8Array(buf, o, n));
    expect(ascii(0, 4)).toBe('RIFF');
    expect(ascii(8, 4)).toBe('WAVE');
    expect(ascii(12, 4)).toBe('fmt ');
    expect(ascii(36, 4)).toBe('data');
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(samples.length * 2);
    expect(buf.byteLength).toBe(44 + samples.length * 2);
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(50, true)).toBe(0x7fff);
    expect(view.getInt16(52, true)).toBe(-0x8000);
  });
});

describe('mutateRecipe', () => {
  it('keeps every parameter inside its allowed range', () => {
    for (const preset of PRESETS) {
      for (let seed = 1; seed < 20; seed++) {
        const m = mutateRecipe(preset.recipe, { amount: 1, seed });
        for (const layer of m.layers) {
          for (const spec of LAYER_PARAMS) {
            expect(layer[spec.key]).toBeGreaterThanOrEqual(spec.min);
            expect(layer[spec.key]).toBeLessThanOrEqual(spec.max);
          }
        }
        expect(m.reverb.amount).toBeGreaterThanOrEqual(0);
        expect(m.reverb.amount).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is reproducible for the same mutation seed', () => {
    const a = mutateRecipe(PRESETS[0].recipe, { amount: 0.4, seed: 7 });
    const b = mutateRecipe(PRESETS[0].recipe, { amount: 0.4, seed: 7 });
    expect(a.layers.map((l) => l.frequency)).toEqual(b.layers.map((l) => l.frequency));
    expect(a.seed).toBe(b.seed);
  });

  it('does not mutate the original', () => {
    const original = structuredClone(PRESETS[0].recipe);
    mutateRecipe(PRESETS[0].recipe, { amount: 1, seed: 3 });
    expect(PRESETS[0].recipe).toEqual(original);
  });

  it('stays close to the original for small amounts', () => {
    const base = PRESETS.find((p) => p.id === 'laser')!.recipe;
    const m = mutateRecipe(base, { amount: 0.1, seed: 11 });
    const ratio = m.layers[0].frequency / base.layers[0].frequency;
    expect(ratio).toBeGreaterThan(0.7);
    expect(ratio).toBeLessThan(1.4);
  });
});

describe('serialization', () => {
  it('round-trips through JSON', () => {
    const recipe = PRESETS[3].recipe;
    const parsed = parseRecipe(JSON.stringify(recipe));
    expect(parsed).toEqual(recipe);
  });

  it('round-trips through a URL-safe string', () => {
    const recipe = PRESETS[5].recipe;
    const encoded = encodeRecipeForUrl(recipe);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(decodeRecipeFromUrl(encoded)).toEqual(recipe);
  });

  it('fills in defaults and clamps bad input', () => {
    const parsed = parseRecipe({
      name: 'odd',
      layers: [{ waveform: 'nope', frequency: 1e9, gain: 'loud', filterType: 'lowpass' }],
    });
    expect(parsed.layers).toHaveLength(1);
    expect(parsed.layers[0].waveform).toBe('sine');
    expect(parsed.layers[0].frequency).toBe(8000);
    expect(parsed.layers[0].gain).toBe(0.8);
    expect(parsed.layers[0].filterType).toBe('lowpass');
    expect(parsed.reverb.amount).toBe(0);
  });

  it('rejects non-objects', () => {
    expect(() => parseRecipe('42')).toThrow();
    expect(() => parseRecipe('not json')).toThrow();
  });
});
