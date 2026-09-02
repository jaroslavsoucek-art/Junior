import { describe, expect, it } from 'vitest';
import { computeLoad, cyclePairOff, playSecondsSince, proposeRotation, rotationAnchor, type RotationInput } from './rotation';
import { SEED_FORMATIONS, SEED_PLAYERS } from '../data/seed';

const f = SEED_FORMATIONS[0]; // 2-3-2: gk, 1 DEF, 2 DEF, 3 MID_W, 4 MID_C, 5 MID_W, 6 FWD, 7 FWD
const id = (n: number | 'gk') => `${f.id}-${n}`;
const base: RotationInput = {
  formation: f,
  onPitch: { [id('gk')]: 'adis', [id(1)]: 'jony', [id(2)]: 'pilka', [id(3)]: 'albi', [id(4)]: 'sima', [id(5)]: 'honza', [id(6)]: 'ondra', [id(7)]: 'marian' },
  benchIds: ['nik', 'adri', 'korci', 'damian'],
  players: SEED_PLAYERS,
  seconds: { adis: 600, jony: 600, pilka: 600, albi: 600, sima: 600, honza: 300, ondra: 600, marian: 600 },
  rotateGoalkeeper: false,
};

describe('proposeRotation', () => {
  it('one pair per field-capable bench player, on their positions', () => {
    const pairs = proposeRotation(base);
    // nik is a pure GK and GK is not rotated → skipped; 3 pairs
    expect(pairs).toHaveLength(3);
    const byOn = Object.fromEntries(pairs.map((p) => [p.onPlayerId, p]));
    expect(['jony', 'pilka']).toContain(byOn.adri.offPlayerId); // DEF for DEF
    expect(byOn.korci.offPlayerId).toBe('sima'); // MID_C for MID_C
    expect(byOn.damian.offPlayerId).toBe('albi'); // MID_W: albi (600) has more minutes than honza (300)
    expect(pairs.every((p) => p.slotId !== id('gk'))).toBe(true);
  });

  it('rotates the goalkeeper when enabled', () => {
    const pairs = proposeRotation({ ...base, rotateGoalkeeper: true });
    expect(pairs.find((p) => p.onPlayerId === 'nik')?.offPlayerId).toBe('adis');
  });

  it('fit is judged by the slot role, not by who stands there', () => {
    const pairs = proposeRotation({ ...base, benchIds: ['kristian'], onPitch: { ...base.onPitch, [id(3)]: 'sima', [id(4)]: 'korci', [id(5)]: 'jara' }, seconds: { ...base.seconds, korci: 900, jara: 100, sima: 500 } });
    // kristian (MID_W) → both wing slots fit exactly; sima (500) has more minutes than jara (100)
    expect(pairs[0].offPlayerId).toBe('sima');
    expect(pairs[0].slotId).toBe(id(3));
  });

  it('a defender with no defender on the pitch falls back to the midfield group, then anyone', () => {
    const noDef = { ...base.onPitch, [id(1)]: 'korci', [id(2)]: 'kristian' };
    const pairs = proposeRotation({ ...base, onPitch: noDef, benchIds: ['adri'], seconds: { ...base.seconds, korci: 100, kristian: 100, marian: 2000 } });
    // slot roles: DEF slots still exist (occupied by midfielders) → exact fit by slot role wins
    expect([id(1), id(2)]).toContain(pairs[0].slotId);
  });

  it('fewest-minutes bench player is proposed first', () => {
    const pairs = proposeRotation({ ...base, seconds: { ...base.seconds, adri: 400, damian: 0, korci: 200 } });
    expect(pairs.map((p) => p.onPlayerId)).toEqual(['damian', 'korci', 'adri']);
  });

  it('cyclePairOff moves to the next compatible slot, skipping slots used by other pairs', () => {
    const pairs = proposeRotation(base);
    const i = pairs.findIndex((p) => p.onPlayerId === 'damian'); // MID_W → albi
    const cycled = cyclePairOff(base, pairs, i);
    expect(cycled[i].offPlayerId).toBe('honza'); // other MID_W (sima's slot is used by korci)
    const again = cyclePairOff(base, cycled, i);
    expect(['jony', 'pilka', 'ondra', 'marian']).toContain(again[i].offPlayerId); // then group-less fallbacks
  });
});

describe('rotation clock helpers', () => {
  const T0 = 1_700_000_000_000;
  const MIN = 60_000;
  const events = [
    { type: 'PERIOD_START' as const, period: 1, at: T0 },
    { type: 'SUB' as const, at: T0 + 5 * MIN, onPlayerId: 'a', offPlayerId: 'b', slotId: 's' },
    { type: 'PERIOD_END' as const, period: 1, at: T0 + 8 * MIN },
    { type: 'PERIOD_START' as const, period: 1, at: T0 + 10 * MIN },
  ];
  it('anchor is the last SUB or PERIOD_START', () => {
    expect(rotationAnchor(events)).toBe(T0 + 10 * MIN);
    expect(rotationAnchor(events.slice(0, 2))).toBe(T0 + 5 * MIN);
    expect(rotationAnchor([])).toBeNull();
  });
  it('playSecondsSince ignores paused time', () => {
    // since the sub at 5': play 5'..8' = 3 min, pause 8'..10', play 10'..12' = 2 min → 5 min
    expect(playSecondsSince(events, T0 + 5 * MIN, T0 + 12 * MIN)).toBe(5 * 60);
  });
});

describe('computeLoad', () => {
  it('flags clearly under-played players', () => {
    const { avg, rows } = computeLoad(['a', 'b', 'c', 'd'], { a: 1200, b: 1200, c: 1200, d: 0 });
    expect(avg).toBe(900);
    expect(rows[0]).toMatchObject({ playerId: 'd', low: true, deviation: -900 });
    expect(rows[1].low).toBe(false);
  });
  it('no flags at the very start', () => {
    expect(computeLoad(['a', 'b'], {}).rows.every((r) => !r.low)).toBe(true);
  });
});
