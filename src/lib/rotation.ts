import type { Formation, MatchEvent, Player, PositionRole } from '../types';
import { roleFit } from './lineup';
import { clockSegments } from './minutes';

export type RotationPair = { onPlayerId: string; offPlayerId: string; slotId: string };

export type RotationInput = {
  formation: Formation;
  onPitch: Record<string, string>; // slotId -> playerId
  benchIds: string[]; // available, not on pitch
  players: Player[];
  seconds: Record<string, number>; // minutes so far (match)
  rotateGoalkeeper: boolean;
};

function fitFor(players: Map<string, Player>, playerId: string, role: PositionRole): number {
  const p = players.get(playerId);
  return p ? roleFit(p, role) : 0;
}

/** Slots a bench player may go into, best fit first, then most minutes on the pitch first. */
export function candidateSlots(input: RotationInput, benchPlayerId: string, excludeSlotIds: Set<string> = new Set()): string[] {
  const byId = new Map(input.players.map((p) => [p.id, p]));
  return input.formation.slots
    .filter((s) => input.onPitch[s.id] && !excludeSlotIds.has(s.id) && (input.rotateGoalkeeper || s.role !== 'GK'))
    .map((s) => ({ slotId: s.id, fit: fitFor(byId, benchPlayerId, s.role), sec: input.seconds[input.onPitch[s.id]] ?? 0 }))
    .sort((a, b) => b.fit - a.fit || b.sec - a.sec)
    .map((x) => x.slotId);
}

/**
 * Propose one substitution per bench player: fewest-minutes bench player first,
 * each replacing the most-played field player on a compatible position
 * (exact role → same group → anyone). The goalkeeper is left alone unless
 * `rotateGoalkeeper`. Greedy and deterministic – the coach edits by tapping.
 */
export function proposeRotation(input: RotationInput): RotationPair[] {
  const byId = new Map(input.players.map((p) => [p.id, p]));
  const bench = [...input.benchIds]
    .filter((id) => byId.has(id))
    .sort((a, b) => (input.seconds[a] ?? 0) - (input.seconds[b] ?? 0) || byId.get(a)!.name.localeCompare(byId.get(b)!.name, 'cs'));
  const used = new Set<string>();
  const pairs: RotationPair[] = [];
  for (const onPlayerId of bench) {
    const p = byId.get(onPlayerId)!;
    // a pure goalkeeper does not come on for a field player unless he can play there
    if (p.roles.length === 1 && p.roles[0] === 'GK' && !input.rotateGoalkeeper) continue;
    const slotId = candidateSlots(input, onPlayerId, used)[0];
    if (!slotId) break;
    used.add(slotId);
    pairs.push({ onPlayerId, offPlayerId: input.onPitch[slotId], slotId });
  }
  return pairs;
}

/** Change the outgoing player of one pair to the next compatible slot not used by other pairs. */
export function cyclePairOff(input: RotationInput, pairs: RotationPair[], index: number): RotationPair[] {
  const pair = pairs[index];
  if (!pair) return pairs;
  const others = new Set(pairs.filter((_, i) => i !== index).map((p) => p.slotId));
  const options = candidateSlots(input, pair.onPlayerId, others);
  if (options.length <= 1) return pairs;
  const i = options.indexOf(pair.slotId);
  const next = options[(i + 1) % options.length];
  return pairs.map((p, j) => (j === index ? { ...p, slotId: next, offPlayerId: input.onPitch[next] } : p));
}

/** Seconds of running match clock since wall-clock instant `since`. */
export function playSecondsSince(events: MatchEvent[], since: number, now: number): number {
  let ms = 0;
  for (const seg of clockSegments(events, now)) {
    const s = Math.max(seg.start, since);
    const e = Math.min(seg.end, now);
    if (e > s) ms += e - s;
  }
  return Math.floor(ms / 1000);
}

/** Wall-clock anchor for the rotation countdown: last SUB, else last PERIOD_START. */
export function rotationAnchor(events: MatchEvent[]): number | null {
  let anchor: number | null = null;
  for (const e of events) {
    if ((e.type === 'SUB' || e.type === 'PERIOD_START') && (anchor === null || e.at > anchor)) anchor = e.at;
  }
  return anchor;
}

export type Load = { playerId: string; seconds: number; deviation: number; low: boolean };

/**
 * Minutes vs. the average of all available players. "Low" = clearly under
 * average: at least 2 minutes and 30 % below it.
 */
export function computeLoad(availableIds: string[], seconds: Record<string, number>): { avg: number; rows: Load[] } {
  const vals = availableIds.map((id) => seconds[id] ?? 0);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const rows = availableIds
    .map((playerId) => {
      const s = seconds[playerId] ?? 0;
      const deviation = s - avg;
      return { playerId, seconds: s, deviation, low: avg > 0 && deviation <= -120 && s < avg * 0.7 };
    })
    .sort((a, b) => a.seconds - b.seconds);
  return { avg, rows };
}
