import type { Match } from '../types';
import { appeared } from './minutes';

/** Appearances per player: number of finished matches in which the player got on the pitch. */
export function appearances(matches: Match[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of matches) {
    if (m.status !== 'finished') continue;
    for (const id of appeared(m.events)) out[id] = (out[id] ?? 0) + 1;
  }
  return out;
}

export function formatAppearances(n: number | undefined): string {
  const c = n ?? 0;
  if (c === 1) return '1 zápas';
  if (c >= 2 && c <= 4) return `${c} zápasy`;
  return `${c} zápasů`;
}
