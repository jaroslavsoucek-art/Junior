import { describe, expect, it } from 'vitest';
import {
  clockState,
  computeMinutes,
  formatClock,
  onPitch,
  periodElapsedSec,
  withoutLastBatch,
} from './minutes';
import type { MatchEvent } from '../types';

const T0 = 1_700_000_000_000; // arbitrary wall clock
const MIN = 60_000;
const HALF = 30 * MIN;

const on = (playerId: string, slotId: string, at: number): MatchEvent => ({ type: 'PLAYER_ON', playerId, slotId, at });
const off = (playerId: string, at: number): MatchEvent => ({ type: 'PLAYER_OFF', playerId, at });
const sub = (onPlayerId: string, offPlayerId: string, slotId: string, at: number): MatchEvent => ({
  type: 'SUB',
  onPlayerId,
  offPlayerId,
  slotId,
  at,
});
const start = (period: number, at: number): MatchEvent => ({ type: 'PERIOD_START', period, at });
const end = (period: number, at: number): MatchEvent => ({ type: 'PERIOD_END', period, at });

/** Two full 30-min halves with a 10-min break, starters A (gk) and B (def). */
function twoHalves(extra: MatchEvent[] = []): MatchEvent[] {
  return [
    on('A', 'gk', T0),
    on('B', 'def1', T0),
    start(1, T0),
    end(1, T0 + HALF),
    start(2, T0 + HALF + 10 * MIN),
    end(2, T0 + 2 * HALF + 10 * MIN),
    ...extra,
  ];
}

describe('computeMinutes', () => {
  it('counts full match for players on the whole time; break does not count', () => {
    const m = computeMinutes({ events: twoHalves() }, T0 + 5 * 3600_000);
    expect(m.A).toBe(60 * 60);
    expect(m.B).toBe(60 * 60);
  });

  it('substitution at half-time: both players get exactly one half', () => {
    const events = twoHalves([sub('C', 'B', 'def1', T0 + HALF + 3 * MIN)]); // during the break
    const m = computeMinutes({ events }, T0 + 5 * 3600_000);
    expect(m.B).toBe(30 * 60);
    expect(m.C).toBe(30 * 60);
  });

  it('player entering in the second half only gets second-half time', () => {
    const events = twoHalves([sub('C', 'B', 'def1', T0 + HALF + 10 * MIN + 12 * MIN)]);
    const m = computeMinutes({ events }, T0 + 5 * 3600_000);
    expect(m.B).toBe(30 * 60 + 12 * 60);
    expect(m.C).toBe(18 * 60);
  });

  it('double substitution at the same second is independent per player', () => {
    const at = T0 + 10 * MIN;
    const events = [
      on('A', 'gk', T0),
      on('B', 'def1', T0),
      on('C', 'def2', T0),
      start(1, T0),
      sub('D', 'B', 'def1', at),
      sub('E', 'C', 'def2', at),
      end(1, T0 + HALF),
    ];
    const m = computeMinutes({ events }, T0 + HALF);
    expect(m.B).toBe(10 * 60);
    expect(m.C).toBe(10 * 60);
    expect(m.D).toBe(20 * 60);
    expect(m.E).toBe(20 * 60);
    expect(m.A).toBe(30 * 60);
    expect(onPitch(events)).toEqual({ gk: 'A', def1: 'D', def2: 'E' });
  });

  it('running match (no PERIOD_END) counts up to `now`', () => {
    const events = [on('A', 'gk', T0), start(1, T0), sub('B', 'A', 'gk', T0 + 7 * MIN)];
    const now = T0 + 12 * MIN + 30_000;
    const m = computeMinutes({ events }, now);
    expect(m.A).toBe(7 * 60);
    expect(m.B).toBe(5 * 60 + 30);
    expect(periodElapsedSec({ events }, 1, now)).toBe(12 * 60 + 30);
    expect(clockState({ events, status: 'live' })).toEqual({ kind: 'running', period: 1, since: T0 });
  });

  it('pause (END + START of the same period) stops the clock for everyone', () => {
    const events = [
      on('A', 'gk', T0),
      start(1, T0),
      end(1, T0 + 5 * MIN), // pause
      start(1, T0 + 8 * MIN), // resume
    ];
    const now = T0 + 10 * MIN;
    expect(computeMinutes({ events }, now).A).toBe(7 * 60);
    expect(periodElapsedSec({ events }, 1, now)).toBe(7 * 60);
    expect(clockState({ events: events.slice(0, 3), status: 'live' })).toEqual({ kind: 'stopped', period: 1 });
  });

  it('time survives a "restart": same events + later now give consistent totals', () => {
    const events = [on('A', 'gk', T0), start(1, T0)];
    const before = computeMinutes({ events }, T0 + 3 * MIN).A;
    const after = computeMinutes({ events }, T0 + 6 * MIN).A; // app killed & reopened 3 min later
    expect(after - before).toBe(180);
  });

  it('undo removes the whole last batch and totals recompute', () => {
    const at = T0 + 10 * MIN;
    const events = [
      on('A', 'gk', T0),
      on('B', 'def1', T0),
      start(1, T0),
      sub('C', 'B', 'def1', at),
      sub('D', 'A', 'gk', at),
    ];
    const undone = withoutLastBatch(events);
    expect(undone).toHaveLength(3);
    const now = T0 + 20 * MIN;
    expect(computeMinutes({ events: undone }, now)).toEqual({ A: 20 * 60, B: 20 * 60 });
    expect(onPitch(undone)).toEqual({ gk: 'A', def1: 'B' });
    // Undo of a single event leaves the preceding one intact.
    expect(withoutLastBatch(undone)).toHaveLength(2);
  });

  it('is robust to unordered events, OFF without ON and duplicate ON', () => {
    const events = [
      end(1, T0 + HALF),
      sub('B', 'A', 'gk', T0 + 10 * MIN),
      off('Z', T0 + MIN),
      on('A', 'gk', T0),
      on('A', 'gk', T0 + MIN),
      start(1, T0),
    ];
    const m = computeMinutes({ events }, T0 + HALF);
    expect(m).toEqual({ A: 10 * 60, B: 20 * 60 });
    expect(clockState({ events, status: 'finished' })).toEqual({ kind: 'finished' });
    expect(clockState({ events: [], status: 'planned' })).toEqual({ kind: 'not_started' });
  });

  it('PLAYER_OFF frees the slot; player never on pitch is absent from the result', () => {
    const events = [on('A', 'gk', T0), start(1, T0), off('A', T0 + MIN)];
    expect(onPitch(events)).toEqual({});
    expect(computeMinutes({ events }, T0 + 5 * MIN)).toEqual({ A: 60 });
    expect(computeMinutes({ events }, T0 + 5 * MIN).X).toBeUndefined();
  });
});

describe('formatClock', () => {
  it('formats mm:ss', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(30 * 60)).toBe('30:00');
    expect(formatClock(-5)).toBe('00:00');
  });
});
