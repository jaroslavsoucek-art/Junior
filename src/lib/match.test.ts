import { describe, expect, it } from 'vitest';
import { startingLineup } from './match';
import { SEED_FORMATIONS, SEED_PLAYERS } from '../data/seed';
import type { Lineup, Match } from '../types';

const f = SEED_FORMATIONS[0]; // 2-3-2
const lineup: Lineup = {
  id: 'l1',
  name: 'základ',
  formationId: f.id,
  assignments: Object.fromEntries(f.slots.map((s, i) => [s.id, ['adis', 'jony', 'pilka', 'albi', 'sima', 'honza', 'ondra', 'marian'][i]])),
  createdAt: 0,
  updatedAt: 0,
};
const match = (available: string[]): Match => ({
  id: 'm1', opponent: 'X', date: '2026-09-06', halfLengthMin: 30, halvesCount: 2,
  availablePlayerIds: available, startingLineupId: 'l1', events: [], status: 'planned',
  rotationIntervalMin: 5, rotateGoalkeeper: false,
});

describe('startingLineup', () => {
  it('everyone present → full lineup', () => {
    const s = startingLineup(match(SEED_PLAYERS.map((p) => p.id)), [lineup], SEED_FORMATIONS, SEED_PLAYERS);
    expect(s.filled).toBe(8);
    expect(s.missingSlotIds).toEqual([]);
  });
  it('absent player leaves an empty, flagged slot', () => {
    const s = startingLineup(match(SEED_PLAYERS.map((p) => p.id).filter((id) => id !== 'ondra')), [lineup], SEED_FORMATIONS, SEED_PLAYERS);
    expect(s.filled).toBe(7);
    expect(s.missingPlayerIds).toEqual(['ondra']);
    expect(s.missingSlotIds).toEqual([`${f.id}-6`]);
    expect(s.assignments[`${f.id}-6`]).toBeNull();
  });
  it('deactivated player counts as missing even if listed available', () => {
    const players = SEED_PLAYERS.map((p) => (p.id === 'adis' ? { ...p, active: false } : p));
    const s = startingLineup(match(SEED_PLAYERS.map((p) => p.id)), [lineup], SEED_FORMATIONS, players);
    expect(s.missingPlayerIds).toEqual(['adis']);
  });
  it('no lineup → nothing', () => {
    const s = startingLineup({ ...match([]), startingLineupId: null }, [lineup], SEED_FORMATIONS, SEED_PLAYERS);
    expect(s.formation).toBeNull();
    expect(s.filled).toBe(0);
  });
});
