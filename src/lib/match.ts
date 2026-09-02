import type { Formation, Lineup, Match, Player } from '../types';
import type { Assignments } from './lineup';

export type StartingLineup = {
  formation: Formation | null;
  /** slotId -> playerId, only players who are available for the match */
  assignments: Assignments;
  /** slotIds whose saved player is not available (absent or deactivated) */
  missingSlotIds: string[];
  /** players from the saved lineup that are not available */
  missingPlayerIds: string[];
  filled: number;
};

/**
 * Effective starting lineup for a match: the saved lineup filtered by
 * attendance. Absent players leave their slot empty and flagged.
 */
export function startingLineup(match: Match, lineups: Lineup[], formations: Formation[], players: Player[]): StartingLineup {
  const lineup = match.startingLineupId ? lineups.find((l) => l.id === match.startingLineupId) : undefined;
  const formation = lineup ? (formations.find((f) => f.id === lineup.formationId) ?? null) : null;
  const available = new Set(match.availablePlayerIds);
  const active = new Set(players.filter((p) => p.active).map((p) => p.id));
  const assignments: Assignments = {};
  const missingSlotIds: string[] = [];
  const missingPlayerIds: string[] = [];
  if (formation && lineup) {
    for (const slot of formation.slots) {
      const pid = lineup.assignments[slot.id] ?? null;
      if (pid && available.has(pid) && active.has(pid)) {
        assignments[slot.id] = pid;
      } else {
        assignments[slot.id] = null;
        if (pid) {
          missingSlotIds.push(slot.id);
          missingPlayerIds.push(pid);
        }
      }
    }
  }
  return {
    formation,
    assignments,
    missingSlotIds,
    missingPlayerIds,
    filled: Object.values(assignments).filter(Boolean).length,
  };
}

export const MIN_PLAYERS = 8;

export function formatMatchDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' });
}

export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
