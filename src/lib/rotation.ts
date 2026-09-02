import type { Formation, Player, PositionRole } from '../types';
import { roleFit } from './lineup';

// ---------------------------------------------------------------------------
// Rotation plan prepared before the match: slotId -> players who share that
// position (the starter plus the bench players who rotate into it).

export type RotationGroups = Record<string, string[]>;

const ROLE_ORDER: Record<PositionRole, number> = { GK: 0, DEF: 1, MID_C: 2, MID_W: 3, FWD: 4 };

/**
 * Auto plan: every bench player joins the slot he fits best; slots that do not
 * have a partner yet are preferred so minutes spread over as many positions
 * as possible. Pure GKs stay out unless the goalkeeper rotates.
 */
export function planRotationGroups(
  formation: Formation,
  starting: Record<string, string | null>,
  benchIds: string[],
  players: Player[],
  rotateGoalkeeper: boolean,
): RotationGroups {
  const byId = new Map(players.map((p) => [p.id, p]));
  const groups: RotationGroups = {};
  for (const s of formation.slots) if (starting[s.id]) groups[s.id] = [starting[s.id]!];

  const bench = benchIds
    .filter((id) => byId.has(id))
    .sort((a, b) => ROLE_ORDER[byId.get(a)!.roles[0] ?? 'FWD'] - ROLE_ORDER[byId.get(b)!.roles[0] ?? 'FWD'] || byId.get(a)!.name.localeCompare(byId.get(b)!.name, 'cs'));

  for (const pid of bench) {
    const p = byId.get(pid)!;
    if (p.roles.length === 1 && p.roles[0] === 'GK' && !rotateGoalkeeper) continue;
    const best = formation.slots
      .filter((s) => groups[s.id] && (rotateGoalkeeper || s.role !== 'GK'))
      .map((s) => ({ id: s.id, fit: roleFit(p, s.role), size: groups[s.id].length }))
      .sort((a, b) => b.fit - a.fit || a.size - b.size)[0];
    if (best) groups[best.id].push(pid);
  }
  return groups;
}

/** Move a player to another slot's group (or out of the plan with `slotId = null`). */
export function setRotationPartner(groups: RotationGroups, playerId: string, slotId: string | null): RotationGroups {
  const out: RotationGroups = {};
  for (const [k, v] of Object.entries(groups)) out[k] = v.filter((id) => id !== playerId);
  if (slotId) out[slotId] = [...(out[slotId] ?? []), playerId];
  return out;
}

/** Keep only slots of this formation and players that are available. */
export function sanitizeGroups(groups: RotationGroups, formation: Formation, availableIds: string[]): RotationGroups {
  const slots = new Set(formation.slots.map((s) => s.id));
  const avail = new Set(availableIds);
  const out: RotationGroups = {};
  for (const [k, v] of Object.entries(groups)) {
    if (!slots.has(k)) continue;
    const ids = v.filter((id) => avail.has(id));
    if (ids.length) out[k] = ids;
  }
  return out;
}
