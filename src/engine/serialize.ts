/**
 * Recipe (de)serialization. Recipes are plain JSON; `parseRecipe` validates
 * loosely-typed input (file imports, URL hashes) and fills in any missing
 * fields with defaults so older or hand-written recipes still load.
 */
import type { Layer, Recipe } from './types.js';
import { FILTER_TYPES, LAYER_PARAMS, WAVEFORMS, clampParam, defaultLayer, defaultRecipe } from './params.js';

export function serializeRecipe(recipe: Recipe): string {
  return JSON.stringify(recipe, null, 2);
}

export function parseRecipe(input: unknown): Recipe {
  const raw = typeof input === 'string' ? JSON.parse(input) : input;
  if (!raw || typeof raw !== 'object') throw new Error('Recipe must be an object');
  const r = raw as Record<string, unknown>;
  const base = defaultRecipe();
  const layersRaw = Array.isArray(r.layers) ? r.layers : [];
  return {
    version: 1,
    name: typeof r.name === 'string' ? r.name : base.name,
    ...(typeof r.description === 'string' && r.description ? { description: r.description } : {}),
    seed: num(r.seed, base.seed) >>> 0,
    masterGain: clamp(num(r.masterGain, base.masterGain), 0, 1),
    normalize: typeof r.normalize === 'boolean' ? r.normalize : base.normalize,
    reverb: {
      amount: clamp(num(obj(r.reverb).amount, base.reverb.amount), 0, 1),
      size: clamp(num(obj(r.reverb).size, base.reverb.size), 0.05, 6),
    },
    echo: {
      amount: clamp(num(obj(r.echo).amount, base.echo.amount), 0, 1),
      time: clamp(num(obj(r.echo).time, base.echo.time), 0.01, 1),
      feedback: clamp(num(obj(r.echo).feedback, base.echo.feedback), 0, 0.95),
    },
    layers: layersRaw.map(parseLayer),
  };
}

function parseLayer(input: unknown): Layer {
  const r = obj(input);
  const layer = defaultLayer({
    ...(typeof r.id === 'string' && r.id ? { id: r.id } : {}),
    name: typeof r.name === 'string' ? r.name : 'Layer',
    enabled: typeof r.enabled === 'boolean' ? r.enabled : true,
    waveform: WAVEFORMS.includes(r.waveform as Layer['waveform']) ? (r.waveform as Layer['waveform']) : 'sine',
    filterType: FILTER_TYPES.includes(r.filterType as Layer['filterType']) ? (r.filterType as Layer['filterType']) : 'none',
  });
  for (const spec of LAYER_PARAMS) {
    layer[spec.key] = clampParam(spec.key, num(r[spec.key], layer[spec.key]));
  }
  return layer;
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// --- URL-safe encoding for sharing a recipe in a link --------------------

export function encodeRecipeForUrl(recipe: Recipe): string {
  const json = JSON.stringify(recipe);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeRecipeFromUrl(encoded: string): Recipe {
  const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return parseRecipe(new TextDecoder().decode(bytes));
}
