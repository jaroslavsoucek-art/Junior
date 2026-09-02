import type { MatchEvent } from '../types';

/**
 * Pure functions over `Match.events`. The app does not track time any more –
 * the event log only records who came on / went off and in which order.
 */

export function sortedEvents(events: MatchEvent[]): MatchEvent[] {
  return events
    .map((e, i) => [e, i] as const)
    .sort((a, b) => a[0].at - b[0].at || a[1] - b[1])
    .map(([e]) => e);
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

/** Players who were on the pitch at any point of the match. */
export function appeared(events: MatchEvent[]): Set<string> {
  const out = new Set<string>();
  for (const e of events) {
    if (e.type === 'PLAYER_ON') out.add(e.playerId);
    else if (e.type === 'SUB') out.add(e.onPlayerId);
  }
  return out;
}

/**
 * Bench order key: when did the player last leave the pitch (0 = never played
 * → goes first). Lower = has been waiting longer.
 */
export function lastOffOrder(events: MatchEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of sortedEvents(events)) {
    if (e.type === 'SUB') out[e.offPlayerId] = e.at;
    else if (e.type === 'PLAYER_OFF') out[e.playerId] = e.at;
  }
  return out;
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
