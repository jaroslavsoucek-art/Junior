import type { AppData } from '../store';
import { ALL_ROLES } from '../types';

export const EXPORT_SCHEMA = 'junior';
export const EXPORT_VERSION = 1;

export type ExportFile = {
  schema: typeof EXPORT_SCHEMA;
  version: number;
  exportedAt: string;
  data: AppData;
};

export function buildExport(data: AppData, now = new Date()): ExportFile {
  return { schema: EXPORT_SCHEMA, version: EXPORT_VERSION, exportedAt: now.toISOString(), data };
}

export function exportFileName(now = new Date()): string {
  return `junior-${now.toISOString().slice(0, 10)}.json`;
}

export type ParseResult = { ok: true; data: AppData; exportedAt: string | null } | { ok: false; error: string };

/** Strict-enough validation: we refuse anything that would crash the app later. */
export function parseImport(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Soubor není platný JSON.' };
  }
  if (!isObj(raw)) return { ok: false, error: 'Neočekávaný obsah souboru.' };

  // Accept both the wrapped export and a bare AppData object.
  const wrapped = raw.schema === EXPORT_SCHEMA && isObj(raw.data);
  const data = wrapped ? (raw.data as Record<string, unknown>) : raw;
  const exportedAt = wrapped && typeof raw.exportedAt === 'string' ? raw.exportedAt : null;

  if (wrapped && typeof raw.version === 'number' && raw.version > EXPORT_VERSION) {
    return { ok: false, error: `Soubor je z novější verze appky (v${raw.version}).` };
  }

  for (const key of ['players', 'formations', 'lineups', 'matches'] as const) {
    if (!Array.isArray(data[key])) return { ok: false, error: `Chybí pole „${key}“.` };
  }
  if (!isObj(data.settings)) return { ok: false, error: 'Chybí „settings“.' };

  const players = data.players as unknown[];
  for (const p of players) {
    if (!isObj(p) || typeof p.id !== 'string' || typeof p.name !== 'string' || !Array.isArray(p.roles)) {
      return { ok: false, error: 'Hráč má neplatný tvar.' };
    }
    if (!p.roles.every((r) => (ALL_ROLES as string[]).includes(r as string))) {
      return { ok: false, error: `Hráč ${p.name} má neznámou roli.` };
    }
  }
  for (const f of data.formations as unknown[]) {
    if (!isObj(f) || typeof f.id !== 'string' || !Array.isArray(f.slots) || f.slots.length !== 8) {
      return { ok: false, error: 'Formace musí mít přesně 8 slotů.' };
    }
  }
  for (const m of data.matches as unknown[]) {
    if (!isObj(m) || typeof m.id !== 'string' || !Array.isArray(m.events)) {
      return { ok: false, error: 'Zápas má neplatný tvar.' };
    }
  }

  const settings = data.settings as Record<string, unknown>;
  const s = {
    defaultHalfLengthMin: num(settings.defaultHalfLengthMin, 30),
    defaultHalvesCount: num(settings.defaultHalvesCount, 2),
    defaultRotationIntervalMin: num(settings.defaultRotationIntervalMin, 5),
    wakeLockNoticeShown: settings.wakeLockNoticeShown === true,
  };

  return {
    ok: true,
    exportedAt,
    data: {
      players: players as AppData['players'],
      formations: data.formations as AppData['formations'],
      lineups: data.lineups as AppData['lineups'],
      // Older exports may lack the rotation fields – fill defaults.
      matches: (data.matches as AppData['matches']).map((m) => ({
        ...m,
        rotationIntervalMin: num(m.rotationIntervalMin, s.defaultRotationIntervalMin),
        rotateGoalkeeper: m.rotateGoalkeeper === true,
        rotationGroups: isObj(m.rotationGroups) ? (m.rotationGroups as Record<string, string[]>) : {},
      })),
      settings: s,
    },
  };
}

export type ImportPreview = {
  counts: { label: string; current: number; incoming: number }[];
  addedPlayers: string[];
  removedPlayers: string[];
};

/** What the import would overwrite, for the confirmation screen. */
export function previewImport(current: AppData, incoming: AppData): ImportPreview {
  const curNames = new Set(current.players.map((p) => p.name));
  const incNames = new Set(incoming.players.map((p) => p.name));
  const finished = (d: AppData) => d.matches.filter((m) => m.status === 'finished').length;
  return {
    counts: [
      { label: 'Hráči', current: current.players.length, incoming: incoming.players.length },
      { label: 'Formace', current: current.formations.length, incoming: incoming.formations.length },
      { label: 'Sestavy', current: current.lineups.length, incoming: incoming.lineups.length },
      { label: 'Zápasy', current: current.matches.length, incoming: incoming.matches.length },
      { label: 'z toho dohrané', current: finished(current), incoming: finished(incoming) },
    ],
    addedPlayers: incoming.players.filter((p) => !curNames.has(p.name)).map((p) => p.name),
    removedPlayers: current.players.filter((p) => !incNames.has(p.name)).map((p) => p.name),
  };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback;
}
