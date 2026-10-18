/**
 * Calls Claude and turns its structured answer into an engine Recipe. Used by
 * the Vercel function (server key) and, when the user supplies their own key,
 * directly from the browser.
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { parseRecipe, randomSeed, type Recipe } from '../engine/index.js';
import { BrewOutput, SYSTEM_PROMPT, buildUserMessage, type BrewRequest } from './schema.js';

export const BREW_MODEL = 'claude-opus-5-5';
export const MAX_PROMPT_LENGTH = 600;

export interface BrewResult {
  recipe: Recipe;
  notes: string;
}

export class BrewError extends Error {
  constructor(
    message: string,
    public readonly kind: 'input' | 'refusal' | 'auth' | 'rate_limit' | 'unavailable' | 'other' = 'other',
  ) {
    super(message);
    this.name = 'BrewError';
  }
}

export function validateBrewRequest(input: unknown): BrewRequest {
  const r = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const prompt = typeof r.prompt === 'string' ? r.prompt.trim() : '';
  if (!prompt) throw new BrewError('Describe the sound you want first.', 'input');
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new BrewError(`Keep the description under ${MAX_PROMPT_LENGTH} characters.`, 'input');
  }
  let current: Recipe | null = null;
  if (r.current) {
    try {
      current = parseRecipe(r.current);
    } catch {
      throw new BrewError('The current recipe could not be read.', 'input');
    }
    if (current.layers.length > 12) throw new BrewError('That recipe has too many layers to refine.', 'input');
  }
  return { prompt, current };
}

/** Convert Claude's output into a Recipe; parseRecipe clamps every value. */
export function outputToRecipe(out: BrewOutput, current?: Recipe | null): Recipe {
  return parseRecipe({
    version: 1,
    name: out.name,
    description: out.description,
    seed: current?.seed ?? randomSeed(),
    masterGain: out.masterGain,
    normalize: true,
    reverb: out.reverb,
    echo: out.echo,
    layers: out.layers.map((layer) => ({ ...layer, enabled: true })),
  });
}

export async function brewRecipe(client: Anthropic, req: BrewRequest): Promise<BrewResult> {
  let response;
  try {
    response = await client.beta.messages.parse({
      model: BREW_MODEL,
      max_tokens: 16000,
      // Route a safety decline to a fallback model inside the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: zodOutputFormat(BrewOutput) },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: buildUserMessage(req) }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) throw new BrewError('The API key was rejected.', 'auth');
    if (error instanceof Anthropic.RateLimitError) throw new BrewError('Rate limited, try again in a moment.', 'rate_limit');
    if (error instanceof Anthropic.APIError) throw new BrewError(`Claude API error ${error.status}: ${error.message}`);
    throw error;
  }

  if (response.stop_reason === 'refusal') {
    const why = response.stop_details?.explanation;
    throw new BrewError(why ? `Claude declined: ${why}` : 'Claude declined this request.', 'refusal');
  }
  if (response.stop_reason === 'max_tokens') throw new BrewError('The recipe was cut off; try a simpler description.');
  const out = response.parsed_output;
  if (!out) throw new BrewError('Claude did not return a usable recipe. Try rephrasing.');
  return { recipe: outputToRecipe(out, req.current), notes: out.notes };
}
