import { describe, expect, it } from 'vitest';
import { appearances, formatAppearances } from './season';
import type { Match } from '../types';

const T0 = 1_700_000_000_000;
function match(status: Match['status'], events: Match['events']): Match {
  return { id: 'm', opponent: 'X', date: '2026-09-01', halfLengthMin: 30, halvesCount: 2, availablePlayerIds: [], startingLineupId: null, events, status, rotationIntervalMin: 5, rotateGoalkeeper: false, rotationGroups: {} };
}

describe('appearances', () => {
  it('counts only finished matches, subs count as appearance', () => {
    const finished = match('finished', [
      { type: 'PLAYER_ON', playerId: 'A', slotId: 'gk', at: T0 },
      { type: 'SUB', onPlayerId: 'B', offPlayerId: 'A', slotId: 'gk', at: T0 + 1 },
    ]);
    const live = match('live', [{ type: 'PLAYER_ON', playerId: 'C', slotId: 'gk', at: T0 }]);
    expect(appearances([finished, live, finished])).toEqual({ A: 2, B: 2 });
    expect(formatAppearances(1)).toBe('1 zápas');
    expect(formatAppearances(3)).toBe('3 zápasy');
    expect(formatAppearances(5)).toBe('5 zápasů');
    expect(formatAppearances(undefined)).toBe('0 zápasů');
  });
});
