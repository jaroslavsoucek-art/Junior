import type { Formation, Player, PositionRole } from '../types';
import { roleFit } from './lineup';

export type RotationPair = { onPlayerId: string; offPlayerId: string; slotId: string };

export type RotationInput = {
  formation: Formation;
  onPitch: Record<string, string>; // slotId -> playerId
  benchIds: string[]; // available, not on pitch
  players: Player[];
  priority: Record<string, number>; // bench order key – lower comes on first (e.g. time of last leaving the pitch, 0 = never played)
  rotateGoalkeeper: boolean;
};

function fitFor(players: Map<string, Player>, playerId: string, role: PositionRole): number {
  const p = players.get(playerId);
  return p ? roleFit(p, role) : 0;
}

/** Slots a bench player may go into, best fit first, then most minutes on the pitch first. */
export function candidateSlots(input: RotationInput, benchPlayerId: string, excludeSlotIds: Set<string> = new Set()): string[] {
  const byId = new Map(input.players.map((p) => [p.id, p]));
  return input.formation.slots
    .filter((s) => input.onPitch[s.id] && !excludeSlotIds.has(s.id) && (input.rotateGoalkeeper || s.role !== 'GK'))
    .map((s) => ({ slotId: s.id, fit: fitFor(byId, benchPlayerId, s.role), sec: input.priority[input.onPitch[s.id]] ?? 0 }))
    .sort((a, b) => b.fit - a.fit || a.sec - b.sec)
    .map((x) => x.slotId);
}

/**
 * Propose one substitution per bench player: the one waiting longest first,
 * each replacing the field player on a compatible position who has been on
 * the pitch longest (exact role → same group → anyone). The goalkeeper is left alone unless
 * `rotateGoalkeeper`. Greedy and deterministic – the coach edits by tapping.
 */
export function proposeRotation(input: RotationInput): RotationPair[] {
  const byId = new Map(input.players.map((p) => [p.id, p]));
  const bench = [...input.benchIds]
    .filter((id) => byId.has(id))
    .sort((a, b) => (input.priority[a] ?? 0) - (input.priority[b] ?? 0) || byId.get(a)!.name.localeCompare(byId.get(b)!.name, 'cs'));
  const used = new Set<string>();
  const pairs: RotationPair[] = [];
  for (const onPlayerId of bench) {
    const p = byId.get(onPlayerId)!;
    // a pure goalkeeper does not come on for a field player unless he can play there
    if (p.roles.length === 1 && p.roles[0] === 'GK' && !input.rotateGoalkeeper) continue;
    const slotId = candidateSlots(input, onPlayerId, used)[0];
    if (!slotId) break;
    used.add(slotId);
    pairs.push({ onPlayerId, offPlayerId: input.onPitch[slotId], slotId });
  }
  return pairs;
}

/** Change the outgoing player of one pair to the next compatible slot not used by other pairs. */
export function cyclePairOff(input: RotationInput, pairs: RotationPair[], index: number): RotationPair[] {
  const pair = pairs[index];
  if (!pair) return pairs;
  const others = new Set(pairs.filter((_, i) => i !== index).map((p) => p.slotId));
  const options = candidateSlots(input, pair.onPlayerId, others);
  if (options.length <= 1) return pairs;
  const i = options.indexOf(pair.slotId);
  const next = options[(i + 1) % options.length];
  return pairs.map((p, j) => (j === index ? { ...p, slotId: next, offPlayerId: input.onPitch[next] } : p));
}

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

/**
 * Live proposal from the plan: for every slot group, the group member on the
 * bench who has waited longest comes on for the current occupant. Bench
 * players outside the plan are then placed by the generic fit rule on slots
 * not yet used. One tap executes the whole batch.
 */
export function proposeFromPlan(input: RotationInput, groups: RotationGroups): RotationPair[] {
  const bench = new Set(input.benchIds);
  const used = new Set<string>();
  const placed = new Set<string>();
  const pairs: RotationPair[] = [];
  const sec = (id: string) => input.priority[id] ?? 0;

  for (const slot of input.formation.slots) {
    const occupant = input.onPitch[slot.id];
    const members = (groups[slot.id] ?? []).filter((id) => bench.has(id) && !placed.has(id));
    if (!occupant || members.length === 0) continue;
    if (slot.role === 'GK' && !input.rotateGoalkeeper) continue;
    const on = members.sort((a, b) => sec(a) - sec(b))[0];
    pairs.push({ onPlayerId: on, offPlayerId: occupant, slotId: slot.id });
    used.add(slot.id);
    placed.add(on);
  }
  const rest = proposeRotation({ ...input, benchIds: input.benchIds.filter((id) => !placed.has(id)), onPitch: Object.fromEntries(Object.entries(input.onPitch).filter(([s]) => !used.has(s))) });
  return [...pairs, ...rest];
}

/** After a substitution, keep the plan in sync: both players belong to that slot's group. */
export function absorbSubs(groups: RotationGroups, subs: RotationPair[]): RotationGroups {
  let out = groups;
  for (const s of subs) {
    out = setRotationPartner(out, s.onPlayerId, s.slotId);
    if (!(out[s.slotId] ?? []).includes(s.offPlayerId)) out = { ...out, [s.slotId]: [...(out[s.slotId] ?? []), s.offPlayerId] };
  }
  return out;
}
