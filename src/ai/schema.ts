/**
 * What Claude is asked to produce: a recipe-shaped object, validated with Zod
 * and handed to the API as a structured-output schema. Kept separate from the
 * engine's `Recipe` type because this is a wire format (no ids, no seed, no
 * version) and every field is required so the schema is strict.
 */
import { z } from 'zod';
import { FILTER_TYPES, LAYER_PARAMS, WAVEFORMS, type Recipe } from '../engine/index.js';
import { PRESETS } from '../engine/presets.js';

export const BrewLayer = z.object({
  name: z.string().describe('Short name for the ingredient, e.g. "Whoosh"'),
  waveform: z.enum(WAVEFORMS as [string, ...string[]]),
  gain: z.number(),
  delay: z.number().describe('Seconds before the layer starts'),
  frequency: z.number().describe('Start pitch in Hz (ignored for noise)'),
  frequencyEnd: z.number().describe('End pitch in Hz; exponential glide from frequency'),
  vibratoRate: z.number(),
  vibratoDepth: z.number().describe('Semitones'),
  duty: z.number().describe('Square pulse width 0.05..0.95'),
  attack: z.number(),
  hold: z.number(),
  release: z.number(),
  filterType: z.enum(FILTER_TYPES as [string, ...string[]]),
  filterCutoff: z.number(),
  filterCutoffEnd: z.number(),
  filterQ: z.number(),
  distortion: z.number(),
  bitcrush: z.number(),
});

export const BrewOutput = z.object({
  name: z.string().describe('A short title for the sound, 1-3 words'),
  description: z.string().describe('One line describing the sound'),
  notes: z
    .string()
    .describe('One or two sentences for the user explaining the sound-design choices, in plain language'),
  masterGain: z.number(),
  reverb: z.object({ amount: z.number(), size: z.number() }),
  echo: z.object({ amount: z.number(), time: z.number(), feedback: z.number() }),
  layers: z.array(BrewLayer).min(1).max(8),
});

export type BrewOutput = z.infer<typeof BrewOutput>;

function paramTable(): string {
  return LAYER_PARAMS.map((p) => `- ${p.key}: ${p.min}..${p.max}${p.unit ? ` ${p.unit}` : ''} (${p.label})`).join('\n');
}

function exampleRecipe(id: string): string {
  const preset = PRESETS.find((p) => p.id === id)!;
  const r = preset.recipe;
  const out: BrewOutput = {
    name: r.name,
    description: r.description ?? preset.description,
    notes: '',
    masterGain: r.masterGain,
    reverb: r.reverb,
    echo: r.echo,
    layers: r.layers.map(({ id: _id, enabled: _enabled, ...rest }) => rest),
  };
  return JSON.stringify(out);
}

/**
 * The system prompt is deterministic (no timestamps) so it caches across
 * requests. It teaches Claude the engine rather than general audio theory.
 */
export const SYSTEM_PROMPT = `You are the sound designer inside WaveCauldron, a procedural sound-effect tool for game developers. The user describes a sound; you answer with a recipe that WaveCauldron's synthesizer renders. You do not produce audio yourself, only the recipe.

## The synthesizer
A sound is a mix of 1-8 layers ("ingredients"). Each layer is one voice:
- waveform: sine, square, sawtooth, triangle (pitched) or white, pink, brown (noise; pitch fields ignored).
- Pitch glides exponentially from frequency to frequencyEnd over the layer's whole duration. Optional vibrato (vibratoRate Hz, vibratoDepth semitones).
- Envelope: attack -> hold -> release, in seconds. Layer duration = attack + hold + release. The release has a natural curve.
- Filter: none, lowpass, highpass or bandpass; cutoff sweeps exponentially from filterCutoff to filterCutoffEnd; filterQ is resonance (0.7 neutral, 4+ ringing).
- distortion 0..1 is a soft clip; bitcrush 0..1 reduces bit depth (retro grit).
- gain 0..1 and delay (seconds before the layer starts, used to sequence events: whoosh, then impact, then debris).
Global: masterGain, reverb (amount 0..1, size = tail seconds), echo (amount, time seconds, feedback 0..0.95). The final mix is normalized, so balance layers relative to each other.

Parameter ranges (values outside are clamped):
${paramTable()}
reverb.size: 0.05..6, echo.time: 0.01..1, echo.feedback: 0..0.95.

## Sound-design guidance
- Transients (hits, clicks, impacts): attack 0.001-0.005, short hold, release 0.05-0.5. A sine dropping from ~120 Hz to ~40 Hz is the classic "thump".
- Whooshes and swipes: white or pink noise through a bandpass whose cutoff sweeps (400 -> 2500 Hz for a rising whoosh), attack 0.05-0.2.
- Lasers/zaps: square or saw gliding down (1900 -> 180 Hz) over 0.1-0.25 s. Jumps and power-ups glide up.
- Explosions/thunder: brown noise, lowpass sweeping down, long release, some distortion, plus a sine sub layer.
- Metallic: triangle/saw at inharmonic pitches with bandpass high Q, short attack, medium release; a touch of distortion.
- Magic/sparkle: several sine/triangle layers at high pitches (1.5-5 kHz) with slight delays and vibrato, plus reverb.
- Retro/8-bit: square waves, fixed duty, bitcrush 0.2-0.5, no reverb.
- UI sounds: very short (0.03-0.2 s total), clean, little or no reverb.
- Keep the total duration appropriate: UI 0.05-0.3 s, hits 0.2-0.8 s, spells and explosions 1-3 s, ambience up to 6 s.
- Use 2-5 layers for most sounds. Give each layer a descriptive name. Use delay to sequence multi-stage events.
- Reverb: 0 for UI/retro, 0.2-0.4 for most game SFX, 0.5+ for big spaces. Echo sparingly.

## Examples of good recipes
Laser: ${exampleRecipe('laser')}
Fireball: ${exampleRecipe('fireball')}
Spaceship door: ${exampleRecipe('spaceship-door')}

## Refining
If the user provides a current recipe and asks for a change, keep everything they did not mention and adjust only what the request implies. Preserve layer names where the layer survives.

Fill in every field for every layer. Write the notes for a game developer who may not know audio terms.`;

export interface BrewRequest {
  prompt: string;
  /** When set, the request is treated as a refinement of this recipe. */
  current?: Recipe | null;
}

export function buildUserMessage(req: BrewRequest): string {
  const prompt = req.prompt.trim();
  if (req.current) {
    const { layers, ...rest } = req.current;
    const current = {
      ...rest,
      layers: layers.filter((l) => l.enabled).map(({ id: _id, enabled: _enabled, ...layer }) => layer),
    };
    return `Current recipe:\n${JSON.stringify(current)}\n\nRequested change: ${prompt}`;
  }
  return `Design this sound: ${prompt}`;
}
