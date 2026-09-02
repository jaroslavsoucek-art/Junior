import { describe, expect, it } from 'vitest';
import { buildExport, exportFileName, parseImport, previewImport } from './exportImport';
import { seedData } from '../store';

describe('export / import', () => {
  it('round-trips seed data exactly', () => {
    const data = seedData();
    const text = JSON.stringify(buildExport(data, new Date('2026-09-02T10:00:00Z')));
    const parsed = parseImport(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data).toEqual(data);
    expect(exportFileName(new Date('2026-09-02T10:00:00Z'))).toBe('junior-2026-09-02.json');
  });

  it('rejects garbage', () => {
    expect(parseImport('nope').ok).toBe(false);
    expect(parseImport('{"players": 1}').ok).toBe(false);
    expect(parseImport(JSON.stringify({ players: [{ id: 'x', name: 'X', roles: ['XX'] }], formations: [], lineups: [], matches: [], settings: {} })).ok).toBe(false);
  });

  it('previews added / removed players and counts', () => {
    const cur = seedData();
    const inc = { ...cur, players: [...cur.players.slice(1), { id: 'new', name: 'Nový', roles: ['DEF' as const], active: true }] };
    const p = previewImport(cur, inc);
    expect(p.addedPlayers).toEqual(['Nový']);
    expect(p.removedPlayers).toEqual(['Adis']);
    expect(p.counts[0]).toEqual({ label: 'Hráči', current: 15, incoming: 15 });
  });
});
