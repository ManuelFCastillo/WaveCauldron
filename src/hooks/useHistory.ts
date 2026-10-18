import { useCallback, useRef, useState } from 'react';

const MAX_HISTORY = 50;

/**
 * useState with undo/redo. `set` records a snapshot; `patch` is for slider
 * drags and coalesces consecutive patches under the same key into one undo
 * step so dragging a knob doesn't fill the history with 200 entries.
 */
export function useHistory<T>(initial: T) {
  const [value, setValue] = useState(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const lastPatchKey = useRef<string | null>(null);
  const [, bump] = useState(0);

  const commit = useCallback((next: T, patchKey: string | null) => {
    setValue((prev) => {
      if (patchKey === null || patchKey !== lastPatchKey.current) {
        past.current.push(prev);
        if (past.current.length > MAX_HISTORY) past.current.shift();
      }
      lastPatchKey.current = patchKey;
      future.current = [];
      return next;
    });
  }, []);

  const set = useCallback((next: T) => commit(next, null), [commit]);
  const patch = useCallback((next: T, key: string) => commit(next, key), [commit]);

  const undo = useCallback(() => {
    setValue((prev) => {
      const target = past.current.pop();
      if (target === undefined) return prev;
      future.current.push(prev);
      lastPatchKey.current = null;
      bump((n) => n + 1);
      return target;
    });
  }, []);

  const redo = useCallback(() => {
    setValue((prev) => {
      const target = future.current.pop();
      if (target === undefined) return prev;
      past.current.push(prev);
      lastPatchKey.current = null;
      bump((n) => n + 1);
      return target;
    });
  }, []);

  return {
    value,
    set,
    patch,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
