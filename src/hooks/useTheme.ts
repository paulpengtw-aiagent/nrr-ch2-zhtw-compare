import { useEffect, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type ThemeMode = 'system' | 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** System / light / dark, persisted in localStorage under nrr-theme. */
export function useTheme() {
  const [mode, setMode] = useLocalStorage<ThemeMode>('nrr-theme', 'system');
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_QUERY).matches);

  useEffect(() => {
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const dark = mode === 'dark' || (mode === 'system' && systemDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
  }, [dark]);

  const cycle = () => setMode((m) => (m === 'system' ? 'light' : m === 'light' ? 'dark' : 'system'));

  return { mode, dark, cycle };
}
