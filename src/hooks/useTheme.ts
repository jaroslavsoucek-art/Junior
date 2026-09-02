import { useEffect } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';

/**
 * Applies data-theme on <html> from the setting; "system" follows
 * prefers-color-scheme live. Also keeps the browser chrome colour in sync.
 */
export function useTheme(pref: ThemePref) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = pref === 'dark' || (pref === 'system' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0e1c' : '#f7f6f3');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [pref]);
}
