import { describe, expect, it } from 'vitest';
import { appeared, lastOffOrder, onPitch, withoutLastBatch } from './minutes';
import type { MatchEvent } from '../types';

const T0 = 1_700_000_000_000;
const on = (playerId: string, slotId: string, at: number): MatchEvent => ({ type: 'PLAYER_ON', playerId, slotId, at });
const off = (playerId: string, at: number): MatchEvent => ({ type: 'PLAYER_OFF', playerId, at });
const sub = (onPlayerId: string, offPlayerId: string, slotId: string, at: number): MatchEvent => ({ type: 'SUB', onPlayerId, offPlayerId, slotId, at });

describe('event log', () => {
  it('onPitch follows subs, double sub at the same second is independent per slot', () => {
    const events = [on('A', 'gk', T0), on('B', 'def1', T0), on('C', 'def2', T0), sub('D', 'B', 'def1', T0 + 1), sub('E', 'C', 'def2', T0 + 1)];
    expect(onPitch(events)).toEqual({ gk: 'A', def1: 'D', def2: 'E' });
    expect([...appeared(events)].sort()).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('PLAYER_OFF frees the slot; unordered events are sorted by time', () => {
    const events = [off('A', T0 + 5), on('A', 'gk', T0)];
    expect(onPitch(events)).toEqual({});
  });

  it('lastOffOrder: never played first, then earliest off', () => {
    const events = [on('A', 'gk', T0), on('B', 'd', T0), sub('C', 'B', 'd', T0 + 10), sub('D', 'A', 'gk', T0 + 20)];
    const o = lastOffOrder(events);
    expect(o.B).toBe(T0 + 10);
    expect(o.A).toBe(T0 + 20);
    expect(o.Z).toBeUndefined();
  });

  it('undo removes the whole last batch and leaves earlier events intact', () => {
    const events = [on('A', 'gk', T0), on('B', 'd', T0 + 1), sub('C', 'B', 'd', T0 + 10), sub('D', 'A', 'gk', T0 + 10)];
    const undone = withoutLastBatch(events);
    expect(undone).toHaveLength(2);
    expect(onPitch(undone)).toEqual({ gk: 'A', d: 'B' });
    expect(withoutLastBatch(undone)).toHaveLength(1);
    expect(withoutLastBatch([])).toEqual([]);
  });
});
