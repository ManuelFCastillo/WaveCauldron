import { describe, expect, it } from 'vitest';
import { PRESETS, LAYER_PARAMS, renderRecipe } from '../engine/index.js';
import { BrewOutput, SYSTEM_PROMPT, buildUserMessage } from './schema.js';
import { BrewError, outputToRecipe, validateBrewRequest } from './brew.js';

const sample: BrewOutput = {
  name: 'Mud step',
  description: 'Wet footstep in mud.',
  notes: 'Brown noise gives the squelch; the sine adds weight.',
  masterGain: 0.8,
  reverb: { amount: 0.1, size: 0.6 },
  echo: { amount: 0, time: 0.25, feedback: 0.3 },
  layers: [
    {
      name: 'Squelch', waveform: 'brown', gain: 0.8, delay: 0, frequency: 440, frequencyEnd: 440,
      vibratoRate: 0, vibratoDepth: 0, duty: 0.5, attack: 0.01, hold: 0.05, release: 0.15,
      filterType: 'lowpass', filterCutoff: 1200, filterCutoffEnd: 300, filterQ: 1, distortion: 0.1, bitcrush: 0,
    },
    {
      name: 'Thud', waveform: 'sine', gain: 0.5, delay: 0.01, frequency: 90, frequencyEnd: 45,
      vibratoRate: 0, vibratoDepth: 0, duty: 0.5, attack: 0.002, hold: 0.02, release: 0.1,
      filterType: 'none', filterCutoff: 8000, filterCutoffEnd: 8000, filterQ: 0.7, distortion: 0, bitcrush: 0,
    },
  ],
};

describe('outputToRecipe', () => {
  it('turns Claude output into a playable recipe', () => {
    const recipe = outputToRecipe(sample);
    expect(recipe.name).toBe('Mud step');
    expect(recipe.description).toBe('Wet footstep in mud.');
    expect(recipe.layers).toHaveLength(2);
    expect(recipe.layers[0].enabled).toBe(true);
    expect(recipe.layers[0].id).toBeTruthy();
    const out = renderRecipe(recipe, { sampleRate: 22050 });
    expect(out.length).toBeGreaterThan(1000);
  });

  it('keeps the seed when refining and clamps wild values', () => {
    const current = PRESETS[0].recipe;
    const wild: BrewOutput = {
      ...sample,
      layers: [{ ...sample.layers[0], gain: 7, frequency: -5, release: 99 }],
    };
    const recipe = outputToRecipe(wild, current);
    expect(recipe.seed).toBe(current.seed);
    expect(recipe.layers[0].gain).toBe(1);
    expect(recipe.layers[0].frequency).toBe(20);
    expect(recipe.layers[0].release).toBe(3);
  });

  it('validates against the Zod schema', () => {
    expect(BrewOutput.safeParse(sample).success).toBe(true);
    expect(BrewOutput.safeParse({ ...sample, layers: [] }).success).toBe(false);
    expect(BrewOutput.safeParse({ ...sample, layers: [{ ...sample.layers[0], waveform: 'organ' }] }).success).toBe(false);
  });
});

describe('prompt building', () => {
  it('teaches every parameter range in the system prompt', () => {
    for (const spec of LAYER_PARAMS) expect(SYSTEM_PROMPT).toContain(`- ${spec.key}: ${spec.min}..${spec.max}`);
    expect(SYSTEM_PROMPT).toContain('Laser: {');
  });

  it('includes the current recipe only when refining', () => {
    expect(buildUserMessage({ prompt: 'a bell' })).toBe('Design this sound: a bell');
    const msg = buildUserMessage({ prompt: 'make it longer', current: PRESETS[0].recipe });
    expect(msg).toContain('Current recipe:');
    expect(msg).toContain('Requested change: make it longer');
    expect(msg).not.toContain('"id":');
  });
});

describe('validateBrewRequest', () => {
  it('rejects empty and oversized prompts', () => {
    expect(() => validateBrewRequest({})).toThrow(BrewError);
    expect(() => validateBrewRequest({ prompt: 'x'.repeat(601) })).toThrow(/600/);
  });

  it('accepts a prompt with a current recipe', () => {
    const req = validateBrewRequest({ prompt: 'louder', current: PRESETS[1].recipe });
    expect(req.prompt).toBe('louder');
    expect(req.current?.name).toBe(PRESETS[1].recipe.name);
  });
});
