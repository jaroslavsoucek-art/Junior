import { describe, expect, it } from 'vitest';
import { seasonSeconds } from './season';
import type { Match } from '../types';

const T0 = 1_700_000_000_000;
const MIN = 60_000;

function match(status: Match['status'], events: Match['events']): Match {
  return {
    id: 'm',
    opponent: 'X',
    date: '2026-09-01',
    halfLengthMin: 30,
    halvesCount: 2,
    availablePlayerIds: [],
    startingLineupId: null,
    events,
    status,
    rotationIntervalMin: 5,
    rotateGoalkeeper: false,
  };
}

describe('seasonSeconds', () => {
  it('sums only finished matches', () => {
    const finished = match('finished', [
      { type: 'PLAYER_ON', playerId: 'A', slotId: 'gk', at: T0 },
      { type: 'PERIOD_START', period: 1, at: T0 },
      { type: 'PERIOD_END', period: 1, at: T0 + 30 * MIN },
    ]);
    const live = match('live', [
      { type: 'PLAYER_ON', playerId: 'A', slotId: 'gk', at: T0 },
      { type: 'PERIOD_START', period: 1, at: T0 },
    ]);
    expect(seasonSeconds([finished, live, finished])).toEqual({ A: 60 * 60 });
  });
});
