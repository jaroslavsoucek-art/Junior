import type { Player } from '../types';

/**
 * Two squads (A / B) live in completely separate localStorage keys – roster,
 * lineups, matches, minutes, draft, settings. Switching team reloads the app so
 * the zustand store is created against the other key. Legacy single-team data
 * (`junior-v1`) becomes team B.
 */
export type Team = 'A' | 'B';
export const TEAMS: Team[] = ['A', 'B'];
export const TEAM_KEY = 'junior-team';
const LEGACY_KEY = 'junior-v1';

export function storageKeyFor(team: Team): string {
  return `junior-v1-${team}`;
}

export function getActiveTeam(): Team {
  try {
    const t = localStorage.getItem(TEAM_KEY);
    return t === 'A' ? 'A' : 'B';
  } catch {
    return 'B';
  }
}

export function migrateLegacyStorage(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy && !localStorage.getItem(storageKeyFor('B'))) {
      localStorage.setItem(storageKeyFor('B'), legacy);
      localStorage.removeItem(LEGACY_KEY);
      localStorage.setItem(TEAM_KEY, 'B');
    }
  } catch {
    // storage unavailable – nothing to migrate
  }
}

export function switchTeamAndReload(team: Team): void {
  localStorage.setItem(TEAM_KEY, team);
  window.location.reload();
}

export function otherTeam(team: Team): Team {
  return team === 'A' ? 'B' : 'A';
}

/** Read-only view of the other team's roster (their storage, or their seed if never opened). */
export function readTeamPlayers(team: Team, seed: Player[]): Player[] {
  try {
    const raw = localStorage.getItem(storageKeyFor(team));
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as { state?: { players?: Player[] } };
    return Array.isArray(parsed.state?.players) ? parsed.state!.players! : seed;
  } catch {
    return seed;
  }
}
