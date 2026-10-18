import { useEffect, useState } from 'react';

export type Theme = 'regular' | 'october';

const STORAGE_KEY = 'wavecauldron.theme';

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'regular' || stored === 'october') return stored;
  } catch {
    // Storage unavailable (private mode, etc.).
  }
  // The cauldron gets dressed up for spooky season.
  return new Date().getMonth() === 9 ? 'october' : 'regular';
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore.
    }
  }, [theme]);

  return [theme, () => setTheme((t) => (t === 'october' ? 'regular' : 'october'))];
}
