/**
 * Mutation: produce a variation of a recipe that keeps its character.
 *
 * Every numeric parameter is nudged by a small, seeded random amount scaled
 * by `amount` (0..1). Logarithmic parameters (pitch, cutoff) are nudged
 * multiplicatively so a 100 Hz thump and a 5 kHz zap both move musically.
 * The seed is always replaced so noise-based layers get fresh grains.
 */
import type { Recipe } from './types.js';
import { createRng } from './random.js';
import { LAYER_PARAMS, clampParam, newLayerId } from './params.js';

export interface MutateOptions {
  /** How far to stray, 0..1. 0.15 is a subtle sibling, 0.6 is a cousin. */
  amount: number;
  /** Seed for the mutation itself (so a mutation is reproducible). */
  seed: number;
}

export function mutateRecipe(recipe: Recipe, options: MutateOptions): Recipe {
  const rng = createRng(options.seed);
  const amount = Math.max(0, Math.min(1, options.amount));

  const layers = recipe.layers.map((layer) => {
    const next = { ...layer, id: newLayerId() };
    for (const spec of LAYER_PARAMS) {
      const value = layer[spec.key];
      let mutated: number;
      if (spec.log) {
        // Up to ±(amount * 12) semitones, scaled by a gaussian.
        const semitones = rng.gaussian() * amount * 6;
        mutated = value * Math.pow(2, semitones / 12);
      } else {
        const span = spec.max - spec.min;
        mutated = value + rng.gaussian() * amount * span * 0.12;
      }
      // Parameters that are "off" (0) mostly stay off so a clean sine doesn't
      // suddenly grow vibrato and distortion on a light mutate.
      if (value === 0 && rng.next() > amount * 0.5) mutated = 0;
      next[spec.key] = roundTo(clampParam(spec.key, mutated), spec.step);
    }
    return next;
  });

  return {
    ...recipe,
    seed: rng.int(0xffffffff) >>> 0,
    reverb: {
      amount: clamp01(recipe.reverb.amount + rng.gaussian() * amount * 0.1),
      size: Math.max(0.05, recipe.reverb.size * Math.pow(2, rng.gaussian() * amount * 0.5)),
    },
    echo: { ...recipe.echo },
    layers,
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function roundTo(value: number, step: number): number {
  const decimals = Math.max(0, Math.ceil(-Math.log10(step)));
  return Number((Math.round(value / step) * step).toFixed(decimals));
}
