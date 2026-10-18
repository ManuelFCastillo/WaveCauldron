# WaveCauldron

Wave Cauldron is a creative sound-design studio for indie game and app developers. Generate, mix, and sculpt unique sound effects using procedural synthesis, AI-assisted tools, and intuitive editing. From magical spells and explosions to UI clicks and ambient worlds, brew professional-quality audio without the complexity.

Everything runs in the browser. No accounts, no uploads, no samples to license: every sound is a small JSON **recipe** that the synthesis engine renders deterministically, so a link *is* a save file and a recipe can live in your game repo next to the code that uses it.

## Features

- **Recipes, not samples.** A sound is a list of *ingredients* (layers): oscillator or noise source, pitch glide, vibrato, attack/hold/release envelope, sweeping filter, distortion and bitcrush. Global reverb and echo finish the mix.
- **Presets to start from.** Fireball, explosion, sword clash, laser, jump, coin, UI click, spaceship door, thunder and more, grouped by category.
- **Mutate.** Nudge every parameter a little (or a lot) while keeping the sound's character. **Brew 8 variations** gives you a batch of siblings to audition, so one sword-hit recipe becomes a whole family of hits.
- **Deterministic.** Same recipe + same seed = identical bytes, in the browser, in Node, and in CI.
- **Export.** Mono 16-bit WAV at 44.1 kHz, ready for Unity, Godot, Unreal, Phaser, or anything else. Recipes export as JSON and round-trip through the URL hash.
- **Batch CLI.** Regenerate all of a project's sounds from recipes as a build step.
- Undo/redo, keyboard shortcuts (`Space` play, `M` mutate, `Ctrl+Z` undo), auto-audition on change.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm test                 # engine tests (vitest)
npm run typecheck
npm run build            # production build in dist/
npm run export-presets   # render every preset to ./out/*.wav
```

### Command-line export

```bash
# All presets, plus 4 mutated variations of each, into assets/sfx
npm run export-presets -- --out assets/sfx --variations 4 --amount 0.3

# One or more saved recipes
npm run export-presets -- hurt.cauldron.json coin.cauldron.json --out assets/sfx
```

Variation seeds are derived from the recipe seed, so re-running the export produces the same files.

## How it works

```
Recipe (JSON) ──▶ renderRecipe() ──▶ Float32Array ──▶ Web Audio playback
                                                  └──▶ encodeWav() ──▶ .wav
```

`src/engine/` is a dependency-free TypeScript synthesis engine:

| Module | Role |
| --- | --- |
| `types.ts` | The `Recipe` / `Layer` data model |
| `params.ts` | Parameter ranges (single source of truth for sliders, clamping and mutation) and defaults |
| `dsp.ts` | Oscillators, white/pink/brown noise, RBJ biquad filter, soft clip, bitcrush, echo, Schroeder reverb |
| `render.ts` | Turns a recipe into samples |
| `mutate.ts` | Seeded, range-aware variation |
| `presets.ts` | The starter catalogue |
| `serialize.ts` | JSON and URL-safe encoding with validation |
| `wav.ts` | RIFF/WAVE encoder |

The React UI in `src/` is a thin editor over that engine; `scripts/export-presets.ts` is a thin CLI over it. You can import `src/engine` into your own tooling without pulling in React.

### Recipe format

```json
{
  "version": 1,
  "name": "Laser",
  "seed": 301,
  "masterGain": 0.8,
  "normalize": true,
  "reverb": { "amount": 0, "size": 1 },
  "echo": { "amount": 0, "time": 0.25, "feedback": 0.3 },
  "layers": [
    {
      "name": "Zap",
      "enabled": true,
      "waveform": "square",
      "duty": 0.3,
      "frequency": 1900,
      "frequencyEnd": 180,
      "attack": 0.001,
      "hold": 0.04,
      "release": 0.16,
      "gain": 0.7
    }
  ]
}
```

Any field left out takes its default, so hand-written recipes can be short.

## Roadmap

- Describe a sound in words and have a language model propose a recipe (the model directs the synthesizer; the synthesizer makes the audio, so results stay reproducible and editable).
- Stereo and sample-rate options on export.
- Sample layers (drop in a recording as an ingredient).
- Shareable community preset packs.

## License

Apache 2.0. See [LICENSE](LICENSE).
