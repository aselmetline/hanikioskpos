import { useCallback, useEffect, useState } from 'react';

export type DisplayMode = 'mobile' | 'desktop';

const STORAGE_KEY = 'display-mode';
const DESKTOP_WIDTH = 1280;

function applyMode(mode: DisplayMode) {
  let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'viewport';
    document.head.appendChild(meta);
  }
  meta.content =
    mode === 'desktop'
      ? `width=${DESKTOP_WIDTH}, initial-scale=${Math.min(1, window.innerWidth / DESKTOP_WIDTH)}`
      : 'width=device-width, initial-scale=1.0, maximum-scale=5.0';
  document.documentElement.classList.toggle('force-desktop', mode === 'desktop');
}

export function useDisplayMode() {
  const [mode, setMode] = useState<DisplayMode>(
    () => (localStorage.getItem(STORAGE_KEY) as DisplayMode) || 'mobile'
  );

  useEffect(() => {
    applyMode(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    const onResize = () => applyMode(mode);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [mode]);

  const toggleMode = useCallback(() => {
    setMode((m) => (m === 'mobile' ? 'desktop' : 'mobile'));
  }, []);

  return { mode, setMode, toggleMode, isDesktop: mode === 'desktop' };
}
