/**
 * Starter recipes. Each one is a small "sound recipe" a developer can play,
 * mutate and export as-is, or use as a starting point.
 */
import type { Layer, Recipe } from './types';
import { defaultLayer, defaultRecipe } from './params';

export type PresetCategory = 'Magic' | 'Combat' | 'Retro' | 'UI' | 'World';

export interface Preset {
  id: string;
  name: string;
  category: PresetCategory;
  description: string;
  recipe: Recipe;
}

const L = (name: string, overrides: Partial<Layer>): Layer => defaultLayer({ name, ...overrides });

export const PRESETS: Preset[] = [
  {
    id: 'fireball',
    name: 'Fireball',
    category: 'Magic',
    description: 'Whoosh, impact, crackle and shimmer.',
    recipe: defaultRecipe({
      name: 'Fireball',
      seed: 101,
      reverb: { amount: 0.3, size: 1.2 },
      layers: [
        L('Whoosh', { waveform: 'white', gain: 0.5, attack: 0.15, hold: 0.1, release: 0.35, filterType: 'bandpass', filterCutoff: 400, filterCutoffEnd: 2500, filterQ: 1.2 }),
        L('Impact', { waveform: 'sine', gain: 0.9, delay: 0.18, frequency: 130, frequencyEnd: 38, attack: 0.002, hold: 0.05, release: 0.45, distortion: 0.3 }),
        L('Crackle', { waveform: 'brown', gain: 0.35, delay: 0.2, attack: 0.03, hold: 0.25, release: 0.5, filterType: 'highpass', filterCutoff: 1800, filterCutoffEnd: 900, filterQ: 0.8, bitcrush: 0.35 }),
        L('Shimmer', { waveform: 'triangle', gain: 0.15, delay: 0.2, frequency: 1200, frequencyEnd: 2600, vibratoRate: 8, vibratoDepth: 0.5, attack: 0.02, hold: 0.2, release: 0.6 }),
      ],
    }),
  },
  {
    id: 'ice-shard',
    name: 'Ice shard',
    category: 'Magic',
    description: 'Glassy crystalline chime with a cold tail.',
    recipe: defaultRecipe({
      name: 'Ice shard',
      seed: 102,
      reverb: { amount: 0.45, size: 1.8 },
      layers: [
        L('Crack', { waveform: 'white', gain: 0.5, attack: 0.001, hold: 0.01, release: 0.08, filterType: 'highpass', filterCutoff: 5000, filterCutoffEnd: 9000, filterQ: 2 }),
        L('Chime 1', { waveform: 'sine', gain: 0.6, frequency: 2637, frequencyEnd: 2600, attack: 0.002, hold: 0.05, release: 0.7 }),
        L('Chime 2', { waveform: 'triangle', gain: 0.35, delay: 0.04, frequency: 3951, frequencyEnd: 3900, attack: 0.002, hold: 0.03, release: 0.6 }),
        L('Chime 3', { waveform: 'sine', gain: 0.3, delay: 0.09, frequency: 5274, frequencyEnd: 5200, attack: 0.002, hold: 0.02, release: 0.5 }),
      ],
    }),
  },
  {
    id: 'sparkle',
    name: 'Sparkle',
    category: 'Magic',
    description: 'Twinkling pickup or spell charge.',
    recipe: defaultRecipe({
      name: 'Sparkle',
      seed: 103,
      reverb: { amount: 0.4, size: 1.4 },
      layers: [
        L('Twinkle A', { waveform: 'triangle', gain: 0.5, frequency: 1500, frequencyEnd: 1800, vibratoRate: 6, vibratoDepth: 0.3, attack: 0.01, hold: 0.05, release: 0.4 }),
        L('Twinkle B', { waveform: 'triangle', gain: 0.45, delay: 0.06, frequency: 2250, frequencyEnd: 2700, vibratoRate: 7, vibratoDepth: 0.3, attack: 0.01, hold: 0.05, release: 0.4 }),
        L('Twinkle C', { waveform: 'sine', gain: 0.4, delay: 0.12, frequency: 3000, frequencyEnd: 3600, vibratoRate: 8, vibratoDepth: 0.3, attack: 0.01, hold: 0.05, release: 0.5 }),
        L('Dust', { waveform: 'white', gain: 0.12, attack: 0.05, hold: 0.2, release: 0.4, filterType: 'highpass', filterCutoff: 7000, filterCutoffEnd: 12000, filterQ: 1 }),
      ],
    }),
  },
  {
    id: 'explosion',
    name: 'Explosion',
    category: 'Combat',
    description: 'Big low boom with debris.',
    recipe: defaultRecipe({
      name: 'Explosion',
      seed: 201,
      reverb: { amount: 0.4, size: 1.6 },
      layers: [
        L('Boom', { waveform: 'brown', gain: 0.9, attack: 0.004, hold: 0.15, release: 1.3, filterType: 'lowpass', filterCutoff: 3500, filterCutoffEnd: 180, filterQ: 0.9, distortion: 0.5 }),
        L('Sub', { waveform: 'sine', gain: 0.8, frequency: 85, frequencyEnd: 28, attack: 0.002, hold: 0.1, release: 0.9, distortion: 0.2 }),
        L('Debris', { waveform: 'white', gain: 0.3, delay: 0.05, attack: 0.01, hold: 0.1, release: 0.6, filterType: 'bandpass', filterCutoff: 2000, filterCutoffEnd: 600, filterQ: 1.5, bitcrush: 0.25 }),
      ],
    }),
  },
  {
    id: 'sword-clash',
    name: 'Sword clash',
    category: 'Combat',
    description: 'Metallic ring with a sharp transient.',
    recipe: defaultRecipe({
      name: 'Sword clash',
      seed: 202,
      reverb: { amount: 0.25, size: 0.9 },
      layers: [
        L('Clang', { waveform: 'white', gain: 0.6, attack: 0.001, hold: 0.015, release: 0.12, filterType: 'bandpass', filterCutoff: 3200, filterCutoffEnd: 2200, filterQ: 5 }),
        L('Ring high', { waveform: 'triangle', gain: 0.35, frequency: 2800, frequencyEnd: 2650, attack: 0.001, hold: 0.05, release: 0.55, distortion: 0.15 }),
        L('Ring low', { waveform: 'sawtooth', gain: 0.25, frequency: 1470, frequencyEnd: 1400, attack: 0.001, hold: 0.04, release: 0.4, filterType: 'bandpass', filterCutoff: 1500, filterCutoffEnd: 1200, filterQ: 6 }),
        L('Thump', { waveform: 'sine', gain: 0.6, frequency: 160, frequencyEnd: 60, attack: 0.001, hold: 0.02, release: 0.15 }),
      ],
    }),
  },
  {
    id: 'hurt',
    name: 'Hurt',
    category: 'Combat',
    description: 'Short, gritty damage grunt.',
    recipe: defaultRecipe({
      name: 'Hurt',
      seed: 203,
      layers: [
        L('Body', { waveform: 'sawtooth', gain: 0.8, frequency: 420, frequencyEnd: 110, attack: 0.002, hold: 0.04, release: 0.16, filterType: 'lowpass', filterCutoff: 2500, filterCutoffEnd: 600, filterQ: 1, distortion: 0.45 }),
        L('Grit', { waveform: 'white', gain: 0.3, attack: 0.001, hold: 0.03, release: 0.1, filterType: 'bandpass', filterCutoff: 900, filterCutoffEnd: 400, filterQ: 2, bitcrush: 0.4 }),
      ],
    }),
  },
  {
    id: 'laser',
    name: 'Laser',
    category: 'Retro',
    description: 'Classic falling zap.',
    recipe: defaultRecipe({
      name: 'Laser',
      seed: 301,
      layers: [
        L('Zap', { waveform: 'square', gain: 0.7, duty: 0.3, frequency: 1900, frequencyEnd: 180, attack: 0.001, hold: 0.04, release: 0.16 }),
        L('Sheen', { waveform: 'sine', gain: 0.3, frequency: 2600, frequencyEnd: 300, attack: 0.001, hold: 0.03, release: 0.12 }),
      ],
    }),
  },
  {
    id: 'jump',
    name: 'Jump',
    category: 'Retro',
    description: 'Bouncy upward blip.',
    recipe: defaultRecipe({
      name: 'Jump',
      seed: 302,
      layers: [
        L('Boing', { waveform: 'square', gain: 0.7, duty: 0.5, frequency: 280, frequencyEnd: 720, attack: 0.002, hold: 0.09, release: 0.1 }),
      ],
    }),
  },
  {
    id: 'coin',
    name: 'Coin',
    category: 'Retro',
    description: 'Two-note pickup chime.',
    recipe: defaultRecipe({
      name: 'Coin',
      seed: 303,
      layers: [
        L('Ding', { waveform: 'square', gain: 0.6, duty: 0.5, frequency: 988, frequencyEnd: 988, attack: 0.001, hold: 0.07, release: 0.02 }),
        L('Dong', { waveform: 'square', gain: 0.6, duty: 0.5, delay: 0.08, frequency: 1319, frequencyEnd: 1319, attack: 0.001, hold: 0.2, release: 0.18 }),
      ],
    }),
  },
  {
    id: 'powerup',
    name: 'Power-up',
    category: 'Retro',
    description: 'Rising wobbly fanfare.',
    recipe: defaultRecipe({
      name: 'Power-up',
      seed: 304,
      layers: [
        L('Rise', { waveform: 'sawtooth', gain: 0.6, frequency: 300, frequencyEnd: 1300, vibratoRate: 22, vibratoDepth: 1.2, attack: 0.005, hold: 0.35, release: 0.2, filterType: 'lowpass', filterCutoff: 3000, filterCutoffEnd: 8000, filterQ: 1.5 }),
        L('Sparkle', { waveform: 'sine', gain: 0.35, delay: 0.1, frequency: 600, frequencyEnd: 2600, attack: 0.005, hold: 0.25, release: 0.25 }),
      ],
    }),
  },
  {
    id: 'ui-click',
    name: 'UI click',
    category: 'UI',
    description: 'Crisp, tiny button press.',
    recipe: defaultRecipe({
      name: 'UI click',
      seed: 401,
      layers: [
        L('Tick', { waveform: 'sine', gain: 0.8, frequency: 2600, frequencyEnd: 1500, attack: 0.001, hold: 0.008, release: 0.03 }),
        L('Snap', { waveform: 'white', gain: 0.3, attack: 0.0005, hold: 0.004, release: 0.02, filterType: 'highpass', filterCutoff: 4000, filterCutoffEnd: 4000, filterQ: 0.7 }),
      ],
    }),
  },
  {
    id: 'ui-confirm',
    name: 'UI confirm',
    category: 'UI',
    description: 'Soft, friendly two-tone confirmation.',
    recipe: defaultRecipe({
      name: 'UI confirm',
      seed: 402,
      reverb: { amount: 0.15, size: 0.5 },
      layers: [
        L('Low', { waveform: 'sine', gain: 0.6, frequency: 660, frequencyEnd: 660, attack: 0.003, hold: 0.06, release: 0.08 }),
        L('High', { waveform: 'sine', gain: 0.6, delay: 0.07, frequency: 880, frequencyEnd: 880, attack: 0.003, hold: 0.08, release: 0.18 }),
      ],
    }),
  },
  {
    id: 'ui-error',
    name: 'UI error',
    category: 'UI',
    description: 'Blunt, dissonant buzz for a denied action.',
    recipe: defaultRecipe({
      name: 'UI error',
      seed: 403,
      layers: [
        L('Buzz', { waveform: 'square', gain: 0.5, duty: 0.25, frequency: 220, frequencyEnd: 200, attack: 0.002, hold: 0.12, release: 0.05, filterType: 'lowpass', filterCutoff: 1800, filterCutoffEnd: 1200, filterQ: 1 }),
        L('Rub', { waveform: 'square', gain: 0.35, duty: 0.5, frequency: 233, frequencyEnd: 215, attack: 0.002, hold: 0.12, release: 0.05, filterType: 'lowpass', filterCutoff: 1600, filterCutoffEnd: 1000, filterQ: 1 }),
      ],
    }),
  },
  {
    id: 'spaceship-door',
    name: 'Spaceship door',
    category: 'World',
    description: 'Hydraulic hiss, heavy metal clunk, rumbling tail.',
    recipe: defaultRecipe({
      name: 'Spaceship door',
      seed: 501,
      reverb: { amount: 0.5, size: 2.2 },
      layers: [
        L('Servo', { waveform: 'brown', gain: 0.55, attack: 0.1, hold: 0.3, release: 0.15, filterType: 'lowpass', filterCutoff: 600, filterCutoffEnd: 350, filterQ: 1.2 }),
        L('Hiss', { waveform: 'white', gain: 0.25, attack: 0.05, hold: 0.28, release: 0.12, filterType: 'bandpass', filterCutoff: 1500, filterCutoffEnd: 2500, filterQ: 1 }),
        L('Clunk', { waveform: 'triangle', gain: 0.9, delay: 0.5, frequency: 220, frequencyEnd: 85, attack: 0.002, hold: 0.03, release: 0.5, distortion: 0.35 }),
        L('Rumble', { waveform: 'sine', gain: 0.7, delay: 0.5, frequency: 52, frequencyEnd: 30, attack: 0.01, hold: 0.2, release: 1.1 }),
      ],
    }),
  },
  {
    id: 'footstep',
    name: 'Footstep',
    category: 'World',
    description: 'Dull thud on packed dirt.',
    recipe: defaultRecipe({
      name: 'Footstep',
      seed: 502,
      layers: [
        L('Scuff', { waveform: 'brown', gain: 0.8, attack: 0.003, hold: 0.02, release: 0.09, filterType: 'lowpass', filterCutoff: 900, filterCutoffEnd: 300, filterQ: 0.9 }),
        L('Thud', { waveform: 'sine', gain: 0.5, frequency: 95, frequencyEnd: 50, attack: 0.002, hold: 0.015, release: 0.08 }),
      ],
    }),
  },
  {
    id: 'thunder',
    name: 'Thunder',
    category: 'World',
    description: 'Distant rolling thunder.',
    recipe: defaultRecipe({
      name: 'Thunder',
      seed: 503,
      reverb: { amount: 0.55, size: 3 },
      layers: [
        L('Crack', { waveform: 'white', gain: 0.5, attack: 0.01, hold: 0.08, release: 0.5, filterType: 'lowpass', filterCutoff: 4000, filterCutoffEnd: 400, filterQ: 0.8, distortion: 0.4 }),
        L('Roll', { waveform: 'brown', gain: 0.9, delay: 0.15, attack: 0.3, hold: 0.8, release: 1.8, filterType: 'lowpass', filterCutoff: 300, filterCutoffEnd: 90, filterQ: 1.3, distortion: 0.3 }),
        L('Sub', { waveform: 'sine', gain: 0.5, delay: 0.3, frequency: 45, frequencyEnd: 32, vibratoRate: 3, vibratoDepth: 2, attack: 0.3, hold: 0.6, release: 1.5 }),
      ],
    }),
  },
];

export function findPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

/** Deep-copy a preset so edits in the UI never touch the catalogue. */
export function clonePreset(preset: Preset): Recipe {
  return structuredClone(preset.recipe);
}
