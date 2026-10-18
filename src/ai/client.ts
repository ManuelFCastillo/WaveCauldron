/**
 * Browser entry point for AI brewing. Prefers the server route (/api/brew);
 * if the user has stored their own API key, calls Claude directly instead.
 * The SDK and schema are loaded lazily so the main bundle stays small.
 */
import { parseRecipe, type Recipe } from '../engine/index.js';
import type { BrewRequest } from './schema.js';
import type { BrewResult } from './brew.js';

const KEY_STORAGE = 'wavecauldron.anthropicKey';

export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function setStoredApiKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    // Storage unavailable; the key just won't persist.
  }
}

export class BrewClientError extends Error {
  constructor(
    message: string,
    public readonly kind: string,
  ) {
    super(message);
    this.name = 'BrewClientError';
  }
}

export async function requestBrew(req: BrewRequest, apiKey: string): Promise<BrewResult> {
  if (apiKey) {
    const [{ default: Anthropic }, { brewRecipe, BrewError }] = await Promise.all([
      import('@anthropic-ai/sdk'),
      import('./brew'),
    ]);
    try {
      return await brewRecipe(new Anthropic({ apiKey, dangerouslyAllowBrowser: true }), req);
    } catch (error) {
      if (error instanceof BrewError) throw new BrewClientError(error.message, error.kind);
      throw error;
    }
  }

  let res: Response;
  try {
    res = await fetch('/api/brew', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
    });
  } catch {
    throw new BrewClientError('Could not reach the brewing server.', 'unavailable');
  }
  if (res.status === 404 || res.status === 501) {
    throw new BrewClientError('This build has no AI backend configured.', 'unavailable');
  }
  let data: { recipe?: unknown; notes?: string; error?: string; kind?: string };
  try {
    data = await res.json();
  } catch {
    throw new BrewClientError(`Unexpected response from the server (${res.status}).`, 'other');
  }
  if (!res.ok) throw new BrewClientError(data.error ?? `Server error ${res.status}`, data.kind ?? 'other');
  return { recipe: parseRecipe(data.recipe as Recipe), notes: data.notes ?? '' };
}
