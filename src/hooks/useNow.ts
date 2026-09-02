import { useEffect, useState } from 'react';

/**
 * Wall clock for rendering. The interval only triggers re-renders – every
 * displayed value is derived from Date.now() and the event log, so a phone
 * that sleeps for 3 minutes shows the right time the instant it wakes up
 * (visibilitychange re-renders immediately, without waiting for the next tick).
 */
export function useNow(ticking: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const onVisible = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const id = ticking ? window.setInterval(() => setNow(Date.now()), 1000) : undefined;
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      if (id) window.clearInterval(id);
    };
  }, [ticking]);
  return now;
}
