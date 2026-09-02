import { describe, expect, it } from 'vitest';
import { buildCustomFormation, orderBench, remapAssignments, roleFit } from './lineup';
import { SEED_FORMATIONS, SEED_PLAYERS } from '../data/seed';

const f = (name: string) => SEED_FORMATIONS.find((x) => x.name === name)!;
const p = (id: string) => SEED_PLAYERS.find((x) => x.id === id)!;

describe('remapAssignments', () => {
  it('keeps everyone when switching 2-3-2 → 3-2-2 (wing → centre by group)', () => {
    const from = f('2-3-2');
    const to = f('3-2-2');
    const a = Object.fromEntries(from.slots.map((s, i) => [s.id, ['adis', 'jony', 'pilka', 'albi', 'sima', 'honza', 'ondra', 'marian'][i]]));
    const out = remapAssignments(from, to, a);
    const placed = Object.values(out).filter(Boolean).sort();
    expect(placed).toEqual(['adis', 'albi', 'honza', 'jony', 'marian', 'ondra', 'pilka', 'sima']);
    expect(out['f-3-2-2-gk']).toBe('adis');
    // DEF slots: jony, pilka first, third DEF filled by a leftover midfielder
    expect([out['f-3-2-2-1'], out['f-3-2-2-2']]).toEqual(['jony', 'pilka']);
    // MID_C slots get the true MID_C first, then a winger (same group)
    expect([out['f-3-2-2-4'], out['f-3-2-2-5']]).toContain('sima');
  });

  it('handles partial lineups and nulls', () => {
    const from = f('2-3-2');
    const to = f('3-3-1');
    const out = remapAssignments(from, to, { 'f-2-3-2-gk': 'nik', 'f-2-3-2-6': 'ondra' });
    expect(out['f-3-3-1-gk']).toBe('nik');
    expect(out['f-3-3-1-7']).toBe('ondra');
    expect(Object.values(out).filter(Boolean)).toHaveLength(2);
    expect(Object.keys(out)).toHaveLength(8);
  });
});

describe('orderBench', () => {
  it('with a target role: best fit first, then fewest minutes', () => {
    const bench = [p('ondra'), p('sima'), p('albi'), p('honza'), p('jony')];
    const secs = { albi: 600, honza: 60, sima: 1200 };
    const out = orderBench(bench, secs, 'MID_C').map((x) => x.id);
    // sima is exact MID_C; wingers (same group) next by minutes: honza(60) < albi(600); then others
    expect(out.slice(0, 3)).toEqual(['sima', 'honza', 'albi']);
  });

  it('without target: role order then name', () => {
    const out = orderBench([p('ondra'), p('albi'), p('adis'), p('jony')], {}, null).map((x) => x.id);
    expect(out).toEqual(['adis', 'jony', 'albi', 'ondra']);
  });

  it('roleFit', () => {
    expect(roleFit(p('sima'), 'MID_C')).toBe(2);
    expect(roleFit(p('sima'), 'MID_W')).toBe(1);
    expect(roleFit(p('sima'), 'DEF')).toBe(0);
  });
});

describe('buildCustomFormation', () => {
  it('builds 8 slots, wingers outside', () => {
    const fm = buildCustomFormation('c1', '2-4-1', { DEF: 2, MID_C: 2, MID_W: 2, FWD: 1 });
    expect(fm.slots).toHaveLength(8);
    const mids = fm.slots.filter((s) => s.role === 'MID_C' || s.role === 'MID_W').sort((a, b) => a.x - b.x);
    expect(mids.map((s) => s.role)).toEqual(['MID_W', 'MID_C', 'MID_C', 'MID_W']);
    expect(fm.slots[0].role).toBe('GK');
  });
  it('rejects wrong totals', () => {
    expect(() => buildCustomFormation('c', 'x', { DEF: 3, MID_C: 3, MID_W: 3, FWD: 3 })).toThrow();
  });
  it('all-wingers midfield', () => {
    const fm = buildCustomFormation('c2', '3-3-1', { DEF: 3, MID_C: 0, MID_W: 3, FWD: 1 });
    expect(fm.slots.filter((s) => s.role === 'MID_W')).toHaveLength(3);
  });
});
