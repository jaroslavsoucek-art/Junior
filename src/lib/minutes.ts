import type { Match, MatchEvent } from '../types';

/**
 * Pure functions over `Match.events`. Minutes are NEVER stored; they are
 * always derived from the event log with the wall-clock `now` (Date.now()).
 *
 * Model:
 *  - The match clock runs only inside "segments": PERIOD_START … PERIOD_END
 *    (or … `now` when the last PERIOD_START has no PERIOD_END → running).
 *    A pause is just PERIOD_END + PERIOD_START with the same period number.
 *  - A player is on the pitch from PLAYER_ON / SUB.onPlayerId until
 *    PLAYER_OFF / SUB.offPlayerId (or `now` if still on).
 *  - Playing time = overlap of the player's on-pitch intervals with the clock
 *    segments. Substitutions made at half-time therefore cost nobody a second.
 */

export type Interval = { start: number; end: number };

export function sortedEvents(events: MatchEvent[]): MatchEvent[] {
  // Stable sort by `at`; ties keep insertion order.
  return events
    .map((e, i) => [e, i] as const)
    .sort((a, b) => a[0].at - b[0].at || a[1] - b[1])
    .map(([e]) => e);
}

/** Clock segments (when the match clock was running), per period. */
export function clockSegments(events: MatchEvent[], now: number): (Interval & { period: number })[] {
  const out: (Interval & { period: number })[] = [];
  let open: { start: number; period: number } | null = null;
  for (const e of sortedEvents(events)) {
    if (e.type === 'PERIOD_START') {
      if (open) out.push({ start: open.start, end: e.at, period: open.period }); // defensive: implicit close
      open = { start: e.at, period: e.period };
    } else if (e.type === 'PERIOD_END' && open) {
      out.push({ start: open.start, end: Math.max(e.at, open.start), period: open.period });
      open = null;
    }
  }
  if (open) out.push({ start: open.start, end: Math.max(now, open.start), period: open.period });
  return out;
}

/** On-pitch intervals per player. Open intervals are closed at `now`. */
export function pitchIntervals(events: MatchEvent[], now: number): Map<string, Interval[]> {
  const intervals = new Map<string, Interval[]>();
  const openSince = new Map<string, number>();

  const on = (playerId: string, at: number) => {
    if (!openSince.has(playerId)) openSince.set(playerId, at);
  };
  const off = (playerId: string, at: number) => {
    const start = openSince.get(playerId);
    if (start === undefined) return; // OFF without ON – ignore
    openSince.delete(playerId);
    const list = intervals.get(playerId) ?? [];
    list.push({ start, end: Math.max(at, start) });
    intervals.set(playerId, list);
  };

  for (const e of sortedEvents(events)) {
    switch (e.type) {
      case 'PLAYER_ON':
        on(e.playerId, e.at);
        break;
      case 'PLAYER_OFF':
        off(e.playerId, e.at);
        break;
      case 'SUB':
        off(e.offPlayerId, e.at);
        on(e.onPlayerId, e.at);
        break;
      default:
        break;
    }
  }
  for (const [playerId, start] of openSince) {
    const list = intervals.get(playerId) ?? [];
    list.push({ start, end: Math.max(now, start) });
    intervals.set(playerId, list);
  }
  return intervals;
}

function overlapMs(a: Interval[], b: Interval[]): number {
  let ms = 0;
  for (const x of a) {
    for (const y of b) {
      const s = Math.max(x.start, y.start);
      const e = Math.min(x.end, y.end);
      if (e > s) ms += e - s;
    }
  }
  return ms;
}

/**
 * Seconds played per player, derived purely from events.
 * Players who never appeared are absent from the result (treat as 0).
 */
export function computeMinutes(match: Pick<Match, 'events'>, now: number = Date.now()): Record<string, number> {
  const segments = clockSegments(match.events, now);
  const result: Record<string, number> = {};
  for (const [playerId, intervals] of pitchIntervals(match.events, now)) {
    result[playerId] = Math.floor(overlapMs(intervals, segments) / 1000);
  }
  return result;
}

/** Seconds the clock has run in the given period (sum of its segments). */
export function periodElapsedSec(match: Pick<Match, 'events'>, period: number, now: number = Date.now()): number {
  let ms = 0;
  for (const s of clockSegments(match.events, now)) if (s.period === period) ms += s.end - s.start;
  return Math.floor(ms / 1000);
}

export type ClockState =
  | { kind: 'not_started' }
  | { kind: 'running'; period: number; since: number }
  /** Clock stopped after PERIOD_END. UI offers "resume this period" and "next period / finish". */
  | { kind: 'stopped'; period: number }
  | { kind: 'finished' };

/** Where the match clock is right now, from events + status. */
export function clockState(match: Pick<Match, 'events' | 'status'>): ClockState {
  if (match.status === 'finished') return { kind: 'finished' };
  let last: { period: number; at: number } | null = null;
  let open = false;
  for (const e of sortedEvents(match.events)) {
    if (e.type === 'PERIOD_START') {
      last = { period: e.period, at: e.at };
      open = true;
    } else if (e.type === 'PERIOD_END') {
      open = false;
    }
  }
  if (!last) return { kind: 'not_started' };
  return open ? { kind: 'running', period: last.period, since: last.at } : { kind: 'stopped', period: last.period };
}

/** Current occupancy of slots: slotId -> playerId, derived from events. */
export function onPitch(events: MatchEvent[]): Record<string, string> {
  const slots: Record<string, string> = {};
  for (const e of sortedEvents(events)) {
    if (e.type === 'PLAYER_ON') {
      removePlayer(slots, e.playerId);
      slots[e.slotId] = e.playerId;
    } else if (e.type === 'PLAYER_OFF') {
      removePlayer(slots, e.playerId);
    } else if (e.type === 'SUB') {
      removePlayer(slots, e.offPlayerId);
      removePlayer(slots, e.onPlayerId);
      slots[e.slotId] = e.onPlayerId;
    }
  }
  return slots;
}

function removePlayer(slots: Record<string, string>, playerId: string) {
  for (const k of Object.keys(slots)) if (slots[k] === playerId) delete slots[k];
}

/** Timestamp of the last substitution-like event (for the rotation countdown). */
export function lastSubAt(events: MatchEvent[]): number | null {
  let t: number | null = null;
  for (const e of events) if (e.type === 'SUB' && (t === null || e.at > t)) t = e.at;
  return t;
}

/**
 * Undo: remove the last "batch" – all trailing events sharing the same `at`
 * and type as the last event (a rotation writes N SUBs with one timestamp).
 */
export function withoutLastBatch(events: MatchEvent[]): MatchEvent[] {
  if (events.length === 0) return events;
  const last = events[events.length - 1];
  let i = events.length - 1;
  while (i > 0 && events[i - 1].at === last.at && events[i - 1].type === last.type) i--;
  return events.slice(0, i);
}

export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
