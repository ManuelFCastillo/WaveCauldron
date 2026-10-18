/**
 * Vercel function: POST /api/brew  { prompt, current? }  ->  { recipe, notes }
 *
 * Holds the Anthropic key server-side so the public app never ships it. Set
 * ANTHROPIC_API_KEY in the Vercel project (or in .env.local for `vite`).
 */
import Anthropic from '@anthropic-ai/sdk';
import { BrewError, brewRecipe, validateBrewRequest } from '../src/ai/brew.js';

export const config = { maxDuration: 60 };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return json({ error: 'AI brewing is not configured on this server.', kind: 'unavailable' }, 501);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Expected a JSON body.', kind: 'input' }, 400);
  }

  try {
    const req = validateBrewRequest(body);
    const result = await brewRecipe(new Anthropic(), req);
    return json(result);
  } catch (error) {
    if (error instanceof BrewError) {
      const status = error.kind === 'input' ? 400 : error.kind === 'rate_limit' ? 429 : error.kind === 'refusal' ? 422 : 502;
      return json({ error: error.message, kind: error.kind }, status);
    }
    console.error(error);
    return json({ error: 'Something went wrong while brewing.', kind: 'other' }, 500);
  }
}
