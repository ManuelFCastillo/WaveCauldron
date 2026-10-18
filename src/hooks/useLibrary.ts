import { useCallback, useEffect, useRef, useState } from 'react';
import type { Recipe } from '../engine';
import {
  addCategory,
  addSound,
  loadLibrary,
  mergeLibraries,
  parseLibrary,
  removeCategory,
  removeSound,
  renameCategory,
  saveLibrary,
  updateSound,
  type Library,
  type SavedSound,
} from '../library/store';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The persisted sound library. Actions compute the next value from a ref so
 * `add` can hand back the new sound synchronously.
 */
export function useLibrary() {
  const [library, setLibrary] = useState<Library>(() => loadLibrary(storage()));
  const ref = useRef(library);

  const commit = useCallback((next: Library) => {
    ref.current = next;
    setLibrary(next);
  }, []);

  useEffect(() => {
    saveLibrary(storage(), library);
  }, [library]);

  const add = useCallback(
    (input: { name: string; category: string; recipe: Recipe }): SavedSound => {
      const result = addSound(ref.current, input);
      commit(result.library);
      return result.sound;
    },
    [commit],
  );

  const update = useCallback(
    (id: string, changes: Partial<Pick<SavedSound, 'name' | 'category' | 'recipe'>>) =>
      commit(updateSound(ref.current, id, changes)),
    [commit],
  );
  const remove = useCallback((id: string) => commit(removeSound(ref.current, id)), [commit]);
  const newCategory = useCallback((name: string) => commit(addCategory(ref.current, name)), [commit]);
  const rename = useCallback((from: string, to: string) => commit(renameCategory(ref.current, from, to)), [commit]);
  const removeCat = useCallback((name: string) => commit(removeCategory(ref.current, name)), [commit]);
  const importJson = useCallback(
    (text: string): number => {
      const imported = parseLibrary(text);
      commit(mergeLibraries(ref.current, imported));
      return imported.sounds.length;
    },
    [commit],
  );

  return {
    library,
    add,
    update,
    remove,
    addCategory: newCategory,
    renameCategory: rename,
    removeCategory: removeCat,
    importJson,
  };
}
