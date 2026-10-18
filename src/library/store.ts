/**
 * The user's sound library: saved recipes grouped into categories they
 * define. Pure functions over an immutable Library value, so the hook that
 * persists it to localStorage stays trivial and the logic is testable.
 */
import { parseRecipe, type Recipe } from '../engine/index.js';

export interface SavedSound {
  id: string;
  name: string;
  category: string;
  recipe: Recipe;
  createdAt: number;
  updatedAt: number;
}

export interface Library {
  version: 1;
  categories: string[];
  sounds: SavedSound[];
}

export const DEFAULT_CATEGORY = 'My sounds';
export const AI_CATEGORY = 'AI brews';

export function emptyLibrary(): Library {
  return { version: 1, categories: [], sounds: [] };
}

let counter = 0;
function newId(): string {
  counter += 1;
  return `S${Date.now().toString(36)}${counter.toString(36)}`;
}

export function normalizeCategory(name: string): string {
  return name.trim().replace(/\s+/g, ' ') || DEFAULT_CATEGORY;
}

export function addCategory(library: Library, name: string): Library {
  const category = normalizeCategory(name);
  if (library.categories.includes(category)) return library;
  return { ...library, categories: [...library.categories, category] };
}

export function renameCategory(library: Library, from: string, to: string): Library {
  const target = normalizeCategory(to);
  if (from === target) return library;
  const categories = library.categories.filter((c) => c !== from && c !== target);
  const index = library.categories.indexOf(from);
  categories.splice(index < 0 ? categories.length : Math.min(index, categories.length), 0, target);
  return {
    ...library,
    categories,
    sounds: library.sounds.map((s) => (s.category === from ? { ...s, category: target } : s)),
  };
}

/** Removes a category; its sounds move to the default category rather than being lost. */
export function removeCategory(library: Library, name: string): Library {
  const orphaned = library.sounds.some((s) => s.category === name);
  let next: Library = { ...library, categories: library.categories.filter((c) => c !== name) };
  if (orphaned) {
    next = addCategory(next, DEFAULT_CATEGORY);
    next = { ...next, sounds: next.sounds.map((s) => (s.category === name ? { ...s, category: DEFAULT_CATEGORY } : s)) };
  }
  return next;
}

export function addSound(
  library: Library,
  input: { name: string; category: string; recipe: Recipe },
): { library: Library; sound: SavedSound } {
  const category = normalizeCategory(input.category);
  const now = Date.now();
  const sound: SavedSound = {
    id: newId(),
    name: input.name.trim() || input.recipe.name || 'Untitled',
    category,
    recipe: structuredClone(input.recipe),
    createdAt: now,
    updatedAt: now,
  };
  const withCategory = addCategory(library, category);
  return { library: { ...withCategory, sounds: [...withCategory.sounds, sound] }, sound };
}

export function updateSound(
  library: Library,
  id: string,
  changes: Partial<Pick<SavedSound, 'name' | 'category' | 'recipe'>>,
): Library {
  const category = changes.category !== undefined ? normalizeCategory(changes.category) : undefined;
  let next = category ? addCategory(library, category) : library;
  next = {
    ...next,
    sounds: next.sounds.map((s) =>
      s.id === id
        ? {
            ...s,
            ...(changes.name !== undefined ? { name: changes.name.trim() || s.name } : {}),
            ...(category ? { category } : {}),
            ...(changes.recipe ? { recipe: structuredClone(changes.recipe) } : {}),
            updatedAt: Date.now(),
          }
        : s,
    ),
  };
  return next;
}

export function removeSound(library: Library, id: string): Library {
  return { ...library, sounds: library.sounds.filter((s) => s.id !== id) };
}

export function findSound(library: Library, id: string | null): SavedSound | undefined {
  return id ? library.sounds.find((s) => s.id === id) : undefined;
}

export function soundsIn(library: Library, category: string): SavedSound[] {
  return library.sounds.filter((s) => s.category === category);
}

// --- persistence -----------------------------------------------------------

export const LIBRARY_STORAGE_KEY = 'wavecauldron.library';

export function serializeLibrary(library: Library): string {
  return JSON.stringify(library, null, 2);
}

/** Validates loosely-typed input (storage, imported file); drops anything unusable. */
export function parseLibrary(input: unknown): Library {
  const raw = typeof input === 'string' ? JSON.parse(input) : input;
  if (!raw || typeof raw !== 'object') throw new Error('Library must be an object');
  const r = raw as Record<string, unknown>;
  const soundsRaw = Array.isArray(r.sounds) ? r.sounds : [];
  const sounds: SavedSound[] = [];
  for (const item of soundsRaw) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Record<string, unknown>;
    try {
      const recipe = parseRecipe(s.recipe);
      sounds.push({
        id: typeof s.id === 'string' && s.id ? s.id : newId(),
        name: typeof s.name === 'string' && s.name.trim() ? s.name : recipe.name,
        category: normalizeCategory(typeof s.category === 'string' ? s.category : DEFAULT_CATEGORY),
        recipe,
        createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
        updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : Date.now(),
      });
    } catch {
      // Skip a corrupt entry rather than losing the whole library.
    }
  }
  const declared = Array.isArray(r.categories) ? r.categories.filter((c): c is string => typeof c === 'string') : [];
  const categories: string[] = [];
  for (const c of [...declared.map(normalizeCategory), ...sounds.map((s) => s.category)]) {
    if (!categories.includes(c)) categories.push(c);
  }
  return { version: 1, categories, sounds };
}

export function loadLibrary(storage: Pick<Storage, 'getItem'> | null): Library {
  try {
    const raw = storage?.getItem(LIBRARY_STORAGE_KEY);
    return raw ? parseLibrary(raw) : emptyLibrary();
  } catch {
    return emptyLibrary();
  }
}

export function saveLibrary(storage: Pick<Storage, 'setItem'> | null, library: Library): void {
  try {
    storage?.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
  } catch {
    // Quota exceeded or storage unavailable; the in-memory copy still works.
  }
}

/** Merge an imported library into the current one, skipping duplicate ids. */
export function mergeLibraries(current: Library, imported: Library): Library {
  const ids = new Set(current.sounds.map((s) => s.id));
  let next = current;
  for (const c of imported.categories) next = addCategory(next, c);
  return { ...next, sounds: [...next.sounds, ...imported.sounds.filter((s) => !ids.has(s.id))] };
}
