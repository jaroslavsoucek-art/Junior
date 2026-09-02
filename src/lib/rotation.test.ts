import { describe, expect, it } from 'vitest';
import { planRotationGroups, sanitizeGroups, setRotationPartner } from './rotation';
import { SEED_FORMATIONS, SEED_PLAYERS } from '../data/seed';

const f = SEED_FORMATIONS[0]; // 2-3-2: gk, 1 DEF, 2 DEF, 3 MID_W, 4 MID_C, 5 MID_W, 6 FWD, 7 FWD
const id = (n: number | 'gk') => `${f.id}-${n}`;
describe('rotation plan', () => {
  const starting = { [id('gk')]: 'adis', [id(1)]: 'jony', [id(2)]: 'pilka', [id(3)]: 'albi', [id(4)]: 'sima', [id(5)]: 'honza', [id(6)]: 'ondra', [id(7)]: 'marian' };

  it('planRotationGroups spreads bench players over best-fit slots, one partner per slot first', () => {
    const g = planRotationGroups(f, starting, ['nik', 'adri', 'korci', 'damian', 'jara'], SEED_PLAYERS, false);
    expect(g[id('gk')]).toEqual(['adis']); // pure GK nik not planned
    expect([g[id(1)], g[id(2)]].some((x) => x.includes('adri'))).toBe(true);
    expect(g[id(4)]).toEqual(['sima', 'korci']);
    const wingGroups = [g[id(3)], g[id(5)]];
    expect(wingGroups.flat().filter((x) => x === 'damian' || x === 'jara')).toHaveLength(2);
    expect(wingGroups.every((x) => x.length === 2)).toBe(true); // one winger each, not both on one slot
  });

  it('setRotationPartner moves a player between groups or out of the plan', () => {
    let g = planRotationGroups(f, starting, ['adri'], SEED_PLAYERS, false);
    g = setRotationPartner(g, 'adri', id(4));
    expect(g[id(4)]).toContain('adri');
    expect([g[id(1)], g[id(2)]].flat()).not.toContain('adri');
    g = setRotationPartner(g, 'adri', null);
    expect(Object.values(g).flat()).not.toContain('adri');
  });




  it('sanitizeGroups drops unknown slots and absent players', () => {
    const g = sanitizeGroups({ [id(1)]: ['jony', 'ghost'], 'other-slot': ['x'] }, f, ['jony']);
    expect(g).toEqual({ [id(1)]: ['jony'] });
  });
});
