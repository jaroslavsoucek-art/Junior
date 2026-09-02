import { ROLE_GROUP, type Formation, type FormationSlot, type Player, type PositionRole } from '../types';

export type Assignments = Record<string, string | null>;

/** 2 = same role, 1 = same group (e.g. MID_C ↔ MID_W), 0 = anything else. */
export function roleFit(player: Player, role: PositionRole): 0 | 1 | 2 {
  if (player.roles.length === 0) return 1; // post nezadán – hodí se kamkoli, ale ne přednostně
  if (player.roles.includes(role)) return 2;
  if (player.roles.some((r) => ROLE_GROUP[r] === ROLE_GROUP[role])) return 1;
  return 0;
}

/**
 * Keep as many players on the pitch as possible when switching formation.
 * Pass 1: same role, in slot order. Pass 2: same group. Pass 3: anyone left
 * into any empty slot. Nobody is dropped as long as there are enough slots.
 */
export function remapAssignments(from: Formation, to: Formation, assignments: Assignments): Assignments {
  const placed = from.slots
    .map((s) => ({ role: s.role, playerId: assignments[s.id] ?? null }))
    .filter((x): x is { role: PositionRole; playerId: string } => x.playerId !== null);

  const out: Assignments = Object.fromEntries(to.slots.map((s) => [s.id, null]));
  const remaining = [...placed];

  const fill = (matches: (slot: FormationSlot, role: PositionRole) => boolean) => {
    for (const slot of to.slots) {
      if (out[slot.id] !== null) continue;
      const i = remaining.findIndex((p) => matches(slot, p.role));
      if (i >= 0) {
        out[slot.id] = remaining[i].playerId;
        remaining.splice(i, 1);
      }
    }
  };
  fill((slot, role) => slot.role === role);
  fill((slot, role) => ROLE_GROUP[slot.role] === ROLE_GROUP[role]);
  fill(() => true);
  return out;
}

/**
 * Bench order. With a target role: best fit first, then fewest minutes.
 * Without: by role (GK, DEF, MID_C, MID_W, FWD) then name – the coach reads
 * the bench like a squad list.
 */
export function orderBench(
  players: Player[],
  seconds: Record<string, number>,
  targetRole: PositionRole | null,
): Player[] {
  const roleIndex: Record<PositionRole, number> = { GK: 0, DEF: 1, MID_C: 2, MID_W: 3, FWD: 4 };
  const byName = (a: Player, b: Player) => a.name.localeCompare(b.name, 'cs');
  if (!targetRole) {
    return [...players].sort(
      (a, b) => roleIndex[a.roles[0] ?? 'FWD'] - roleIndex[b.roles[0] ?? 'FWD'] || byName(a, b),
    );
  }
  return [...players].sort(
    (a, b) =>
      roleFit(b, targetRole) - roleFit(a, targetRole) ||
      (seconds[a.id] ?? 0) - (seconds[b.id] ?? 0) ||
      byName(a, b),
  );
}

export type LineCounts = { DEF: number; MID_C: number; MID_W: number; FWD: number };

export function lineCountsTotal(c: LineCounts): number {
  return c.DEF + c.MID_C + c.MID_W + c.FWD;
}

/** Evenly spread `n` x-positions across the pitch width, inset from the lines. */
function spread(n: number, inset = 0.16): number[] {
  if (n <= 0) return [];
  if (n === 1) return [0.5];
  return Array.from({ length: n }, (_, i) => inset + (i * (1 - 2 * inset)) / (n - 1));
}

/**
 * Custom formation from line counts (must total 7). Three lines:
 * defence y≈0.28, midfield y≈0.55 (wingers outside, centres inside), attack y≈0.8.
 */
export function buildCustomFormation(id: string, name: string, counts: LineCounts): Formation {
  if (lineCountsTotal(counts) !== 7) throw new Error('Formation must have exactly 7 field players');
  const slots: FormationSlot[] = [{ id: `${id}-gk`, role: 'GK', x: 0.5, y: 0.12 }];
  let n = 1;
  const push = (role: PositionRole, x: number, y: number) => slots.push({ id: `${id}-${n++}`, role, x, y });

  for (const x of spread(counts.DEF, 0.2)) push('DEF', x, counts.DEF >= 3 && Math.abs(x - 0.5) < 0.01 ? 0.26 : 0.28);

  const mids = counts.MID_C + counts.MID_W;
  const xs = spread(mids, 0.15);
  // wingers take the outermost x positions, centres the inner ones
  const order: PositionRole[] = [];
  let w = counts.MID_W;
  let c = counts.MID_C;
  for (let i = 0; i < mids; i++) {
    const fromEdge = Math.min(i, mids - 1 - i);
    const wantWing = w > 0 && (fromEdge < Math.ceil(counts.MID_W / 2) || c === 0);
    if (wantWing) {
      order.push('MID_W');
      w--;
    } else {
      order.push('MID_C');
      c--;
    }
  }
  order.forEach((role, i) => push(role, xs[i], role === 'MID_W' ? 0.56 : 0.52));

  for (const x of spread(counts.FWD, 0.34)) push('FWD', x, 0.8);
  return { id, name, slots };
}

export function defaultCustomName(c: LineCounts): string {
  const mid = c.MID_C + c.MID_W;
  return [c.DEF, mid, c.FWD].join('-');
}
