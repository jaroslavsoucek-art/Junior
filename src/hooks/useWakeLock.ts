import { useEffect, useState } from 'react';

type WakeLockSentinelLike = { release: () => Promise<void>; addEventListener?: (t: string, cb: () => void) => void };
type NavigatorWithWakeLock = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } };

/**
 * Keep the screen on while `active` (Chrome / Android). Re-requests after the
 * tab comes back to the foreground, because the lock is released on hide.
 * Returns `supported` so the UI can show a one-time note on iOS Safari.
 * No hidden-video hacks: time is derived from Date.now(), so a dark screen is harmless.
 */
export function useWakeLock(active: boolean): { supported: boolean } {
  const nav = typeof navigator !== 'undefined' ? (navigator as NavigatorWithWakeLock) : undefined;
  const supported = !!nav?.wakeLock;
  const [, force] = useState(0);

  useEffect(() => {
    if (!active || !nav?.wakeLock) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;
    const request = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        sentinel = await nav.wakeLock!.request('screen');
        sentinel.addEventListener?.('release', () => force((n) => n + 1));
      } catch {
        // denied (low battery etc.) – harmless, the clock does not depend on it
      }
    };
    void request();
    const onVisible = () => {
      if (!cancelled && document.visibilityState === 'visible') void request();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active, nav]);

  return { supported };
}
