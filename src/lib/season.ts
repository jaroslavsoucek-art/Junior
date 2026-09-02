import type { Match } from '../types';
import { computeMinutes } from './minutes';

/**
 * Season totals in seconds per player: sum over all `finished` matches.
 * Finished matches have every period closed, so any `now` at or after the last
 * event gives the same result; we use the last event's timestamp to stay
 * deterministic.
 */
export function seasonSeconds(matches: Match[]): Record<string, number> {
  const total: Record<string, number> = {};
  for (const m of matches) {
    if (m.status !== 'finished') continue;
    const last = m.events.reduce((acc, e) => Math.max(acc, e.at), 0);
    for (const [playerId, sec] of Object.entries(computeMinutes(m, last))) {
      total[playerId] = (total[playerId] ?? 0) + sec;
    }
  }
  return total;
}

export function formatMinutes(seconds: number | undefined): string {
  const min = Math.floor((seconds ?? 0) / 60);
  return `${min} min`;
}
