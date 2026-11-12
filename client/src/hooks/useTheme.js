import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'studygen-theme';

function getInitialTheme() {
  if (typeof document !== 'undefined') {
    const preset = document.documentElement.dataset.theme;
    if (preset === 'light' || preset === 'dark') {
      return preset;
    }
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // Ignore storage access errors
  }

  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Follow system changes only when the user has not explicitly saved a preference.
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;

    function handleSystemChange(event) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') return;
      } catch {
        // Ignore storage errors
      }
      setTheme(event.matches ? 'dark' : 'light');
    }

    media.addEventListener('change', handleSystemChange);
    return () => media.removeEventListener('change', handleSystemChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore storage errors
      }
      document.documentElement.dataset.theme = next;
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
