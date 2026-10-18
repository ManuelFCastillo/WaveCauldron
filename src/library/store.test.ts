import { describe, expect, it } from 'vitest';
import { PRESETS } from '../engine/index.js';
import {
  AI_CATEGORY,
  DEFAULT_CATEGORY,
  addCategory,
  addSound,
  emptyLibrary,
  loadLibrary,
  mergeLibraries,
  parseLibrary,
  removeCategory,
  removeSound,
  renameCategory,
  saveLibrary,
  updateSound,
} from './store.js';

const recipe = PRESETS[0].recipe;

describe('library store', () => {
  it('adds a sound and creates its category on demand', () => {
    const { library, sound } = addSound(emptyLibrary(), { name: 'Boom', category: '  Weapons ', recipe });
    expect(sound.category).toBe('Weapons');
    expect(library.categories).toEqual(['Weapons']);
    expect(library.sounds[0].recipe).toEqual(recipe);
    expect(library.sounds[0].recipe).not.toBe(recipe); // cloned
  });

  it('updates name, category and recipe in place', () => {
    let { library, sound } = addSound(emptyLibrary(), { name: 'Boom', category: AI_CATEGORY, recipe });
    library = updateSound(library, sound.id, { name: 'Big boom', category: 'Weapons' });
    expect(library.sounds[0].name).toBe('Big boom');
    expect(library.sounds[0].category).toBe('Weapons');
    expect(library.categories).toEqual([AI_CATEGORY, 'Weapons']);
  });

  it('renames a category and moves its sounds', () => {
    let { library } = addSound(emptyLibrary(), { name: 'A', category: 'Old', recipe });
    library = renameCategory(library, 'Old', 'New');
    expect(library.categories).toEqual(['New']);
    expect(library.sounds[0].category).toBe('New');
  });

  it('removing a category keeps its sounds in the default category', () => {
    let { library } = addSound(emptyLibrary(), { name: 'A', category: 'Temp', recipe });
    library = removeCategory(library, 'Temp');
    expect(library.categories).toEqual([DEFAULT_CATEGORY]);
    expect(library.sounds[0].category).toBe(DEFAULT_CATEGORY);
    expect(removeCategory(addCategory(emptyLibrary(), 'Empty'), 'Empty').categories).toEqual([]);
  });

  it('removes sounds', () => {
    const { library, sound } = addSound(emptyLibrary(), { name: 'A', category: 'X', recipe });
    expect(removeSound(library, sound.id).sounds).toHaveLength(0);
  });

  it('round-trips through storage and survives corrupt entries', () => {
    const { library } = addSound(emptyLibrary(), { name: 'A', category: 'X', recipe });
    const storage = new Map<string, string>();
    const fake = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v) };
    saveLibrary(fake, library);
    expect(loadLibrary(fake)).toEqual(library);

    const parsed = parseLibrary({ sounds: [{ name: 'bad', recipe: 42 }, library.sounds[0]], categories: ['Z'] });
    expect(parsed.sounds).toHaveLength(1);
    expect(parsed.categories).toEqual(['Z', 'X']);
    expect(loadLibrary({ getItem: () => 'not json' }).sounds).toEqual([]);
  });

  it('merges imports without duplicating ids', () => {
    const { library: a } = addSound(emptyLibrary(), { name: 'A', category: 'X', recipe });
    const { library: b } = addSound(a, { name: 'B', category: 'Y', recipe });
    const merged = mergeLibraries(a, b);
    expect(merged.sounds.map((s) => s.name)).toEqual(['A', 'B']);
    expect(merged.categories).toEqual(['X', 'Y']);
  });
});
