/**
 * Small deterministic PRNG (mulberry32). Every random element in a render goes
 * through one of these so that a recipe + seed always produces the same bytes.
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform float in [min, max). */
  range(min: number, max: number): number;
  /** Approximately normal, mean 0, stddev 1. */
  gaussian(): number;
  /** Integer in [0, n). */
  int(n: number): number;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    gaussian: () => {
      // Box-Muller, guarding against log(0).
      const u = 1 - next();
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    int: (n) => Math.floor(next() * n),
  };
}

/** A fresh seed for a new recipe or variation. Not cryptographic, just varied. */
export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}
