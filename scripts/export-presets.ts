/**
 * Batch-export every preset (or a single recipe file) to WAV from the command
 * line, so a build step can regenerate a game's sound assets from recipes.
 *
 *   npm run export-presets                       # all presets -> ./out
 *   npm run export-presets -- --out assets/sfx   # custom directory
 *   npm run export-presets -- my-sound.cauldron.json --variations 10
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_SAMPLE_RATE,
  PRESETS,
  encodeWav,
  mutateRecipe,
  parseRecipe,
  renderRecipe,
  type Recipe,
} from '../src/engine';

interface Args {
  out: string;
  files: string[];
  variations: number;
  amount: number;
  sampleRate: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { out: 'out', files: [], variations: 0, amount: 0.25, sampleRate: DEFAULT_SAMPLE_RATE };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--variations') args.variations = Number(argv[++i]);
    else if (a === '--amount') args.amount = Number(argv[++i]);
    else if (a === '--sample-rate') args.sampleRate = Number(argv[++i]);
    else if (a === '--help' || a === '-h') {
      console.log('usage: export-presets [recipe.json ...] [--out dir] [--variations n] [--amount 0..1] [--sample-rate hz]');
      process.exit(0);
    } else args.files.push(a);
  }
  return args;
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sound';
}

function write(recipe: Recipe, dir: string, sampleRate: number): void {
  const samples = renderRecipe(recipe, { sampleRate });
  const file = join(dir, `${slug(recipe.name)}.wav`);
  writeFileSync(file, Buffer.from(encodeWav(samples, sampleRate)));
  console.log(`${file}  (${(samples.length / sampleRate).toFixed(2)}s)`);
}

const args = parseArgs(process.argv.slice(2));
mkdirSync(args.out, { recursive: true });

const recipes: Recipe[] =
  args.files.length > 0
    ? args.files.map((f) => parseRecipe(readFileSync(f, 'utf8')))
    : PRESETS.map((p) => p.recipe);

for (const recipe of recipes) {
  write(recipe, args.out, args.sampleRate);
  for (let i = 0; i < args.variations; i++) {
    // Deterministic seeds so re-running the export yields the same files.
    const variant = mutateRecipe(recipe, { amount: args.amount, seed: recipe.seed * 1000 + i });
    write({ ...variant, name: `${recipe.name} v${i + 1}` }, args.out, args.sampleRate);
  }
}
