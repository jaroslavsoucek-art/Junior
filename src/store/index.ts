import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Formation, Lineup, Match, MatchEvent, Player, Settings } from '../types';
import type { TabId } from '../components/TabBar';
import { DEFAULT_FORMATION_ID, SEED_FORMATIONS, SEED_PLAYERS_BY_TEAM, SEED_REVISION } from '../data/seed';
import { getActiveTeam, migrateLegacyStorage, storageKeyFor, type Team } from '../lib/team';
import { newId } from '../lib/id';
import { remapAssignments, type Assignments } from '../lib/lineup';
import { clockState, withoutLastBatch } from '../lib/minutes';
import { startingLineup } from '../lib/match';
import { absorbSubs, planRotationGroups, setRotationPartner as setPartner, type RotationPair } from '../lib/rotation';

export type AppData = {
  players: Player[];
  formations: Formation[];
  lineups: Lineup[];
  matches: Match[];
  settings: Settings;
};

/**
 * The lineup being edited. Persisted so a half-built lineup survives the app
 * being killed, but not part of the export (it is UI state, not data).
 */
export type Draft = {
  lineupId: string | null; // saved lineup this draft came from (null = unsaved)
  name: string;
  formationId: string;
  assignments: Assignments;
  matchId: string | null; // when editing a match's starting lineup, bench = available players
};

export type MatchInput = Pick<Match, 'opponent' | 'date' | 'halfLengthMin' | 'halvesCount' | 'rotationIntervalMin' | 'rotateGoalkeeper'>;

export type AppState = AppData & {
  draft: Draft;
  tab: TabId; // persisted so a killed app reopens where it was (Live during a match)
  activeMatchId: string | null; // match used by Live
  matchDetailId: string | null; // match open in the Zápas tab (null = list)
  lineupView: 'list' | 'editor'; // Sestava tab: saved lineups first, editor behind
  setTab: (tab: TabId) => void;
  setActiveMatch: (id: string | null) => void;
  openMatchDetail: (id: string | null) => void;
  setLineupView: (v: 'list' | 'editor') => void;

  // Bulk replace – used by import and "smazat všechna data".
  replaceAll: (data: AppData) => void;
  resetToSeed: () => void;

  // Kádr – noví hráči přicházejí jen z druhého týmu
  addPlayer: (player: Player) => void;
  updatePlayer: (id: string, patch: Partial<Pick<Player, 'name' | 'roles' | 'active'>>) => void;

  // Nastavení
  updateSettings: (patch: Partial<Settings>) => void;

  // Editor sestavy
  setDraftFormation: (formationId: string) => void;
  assignToSlot: (slotId: string, playerId: string) => void;
  swapSlots: (a: string, b: string) => void;
  clearSlot: (slotId: string) => void;
  clearDraft: () => void;
  saveDraftAs: (name: string) => string;
  saveDraft: () => void;
  loadLineup: (lineupId: string) => void;
  duplicateLineup: (lineupId: string) => void;
  deleteLineup: (lineupId: string) => void;
  renameLineup: (lineupId: string, name: string) => void;

  // Formace
  addFormation: (f: Formation) => void;
  deleteFormation: (formationId: string) => void;

  // Zápas – příprava
  createMatch: (input: MatchInput, startingLineupId?: string | null) => string;
  updateMatch: (id: string, patch: Partial<MatchInput>) => void;
  deleteMatch: (id: string) => void;
  toggleAvailability: (matchId: string, playerId: string) => void;
  /** Use a saved template lineup as the starting lineup (referenced, not copied). */
  setStartingLineup: (matchId: string, lineupId: string | null) => void;
  /** Create an empty match-specific lineup with the given formation and open it in the editor. */
  createMatchLineup: (matchId: string, formationId: string) => void;
  /**
   * Open the match's starting lineup in the editor. If it is a shared template,
   * a match-specific copy is made first so the template stays untouched.
   */
  editMatchLineup: (matchId: string) => void;
  /** Leave match mode in the editor (draft goes back to a plain template draft). */
  leaveMatchEditing: () => void;

  // Plán střídání (příprava)
  setRotationPartner: (matchId: string, playerId: string, slotId: string | null) => void;
  autoPlanRotation: (matchId: string) => void;

  // Live – every action appends events; minutes are always derived from them
  startMatch: (matchId: string) => void; // status live + PLAYER_ON for the starting eight
  startPeriod: (matchId: string, period: number) => void;
  endPeriod: (matchId: string) => void; // pause or end of period – the UI decides what comes next
  substitute: (matchId: string, subs: RotationPair[]) => void; // one batch, same `at`
  playerOn: (matchId: string, playerId: string, slotId: string) => void;
  playerOff: (matchId: string, playerId: string) => void;
  undoLastEvent: (matchId: string) => void; // removes the whole last batch
  finishMatch: (matchId: string) => void;
};

migrateLegacyStorage();
export const ACTIVE_TEAM: Team = getActiveTeam();
export const STORAGE_KEY = storageKeyFor(ACTIVE_TEAM);

export function emptyAssignments(f: Formation): Assignments {
  return Object.fromEntries(f.slots.map((s) => [s.id, null]));
}

export function emptyDraft(formations: Formation[] = SEED_FORMATIONS): Draft {
  const f = formations.find((x) => x.id === DEFAULT_FORMATION_ID) ?? formations[0];
  return { lineupId: null, name: '', formationId: f.id, assignments: emptyAssignments(f), matchId: null };
}

export function seedData(team: Team = ACTIVE_TEAM): AppData {
  return {
    players: SEED_PLAYERS_BY_TEAM[team],
    formations: SEED_FORMATIONS,
    lineups: [],
    matches: [],
    settings: {
      defaultHalfLengthMin: 30,
      defaultHalvesCount: 2,
      defaultRotationIntervalMin: 5,
      wakeLockNoticeShown: false,
    },
  };
}

type Setter = (fn: (s: AppState) => Partial<AppState>) => void;
function patchMatch(set: Setter, id: string, fn: (m: Match) => Match) {
  set((s) => ({ matches: s.matches.map((m) => (m.id === id ? fn(m) : m)) }));
}

function autoGroups(m: Match, s: AppData): Record<string, string[]> {
  const starting = startingLineup(m, s.lineups, s.formations, s.players);
  if (!starting.formation) return {};
  const onPitch = new Set(Object.values(starting.assignments).filter(Boolean));
  const bench = m.availablePlayerIds.filter((id) => !onPitch.has(id));
  return planRotationGroups(starting.formation, starting.assignments, bench, s.players, m.rotateGoalkeeper);
}

function matchLineupName(m: Match): string {
  const d = new Date(m.date);
  const date = Number.isNaN(d.getTime()) ? m.date : `${d.getDate()}. ${d.getMonth() + 1}.`;
  return `vs ${m.opponent} ${date}`;
}

export function pickData(s: AppData): AppData {
  return {
    players: s.players,
    formations: s.formations,
    lineups: s.lineups,
    matches: s.matches,
    settings: s.settings,
  };
}

/**
 * Zustand + persist. Every `set` writes synchronously to localStorage –
 * the persist middleware serialises on each state change, no debounce.
 */
export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...seedData(),
      draft: emptyDraft(),
      tab: 'roster',
      activeMatchId: null,
      matchDetailId: null,
      lineupView: 'list',
      setTab: (tab) => set({ tab }),
      setActiveMatch: (id) => set({ activeMatchId: id }),
      openMatchDetail: (id) => set({ matchDetailId: id }),
      setLineupView: (v) => set({ lineupView: v }),

      replaceAll: (data) => set(() => ({ ...data, draft: emptyDraft(data.formations), activeMatchId: null })),
      resetToSeed: () => set(() => ({ ...seedData(), draft: emptyDraft(), activeMatchId: null })),

      addPlayer: (player) =>
        set((s) => (s.players.some((p) => p.id === player.id) ? {} : { players: [...s.players, { ...player, active: true }] })),
      updatePlayer: (id, patch) =>
        set((s) => ({
          players: s.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      setDraftFormation: (formationId) =>
        set((s) => {
          const from = s.formations.find((f) => f.id === s.draft.formationId);
          const to = s.formations.find((f) => f.id === formationId);
          if (!to) return {};
          const assignments = from ? remapAssignments(from, to, s.draft.assignments) : emptyAssignments(to);
          return { draft: { ...s.draft, formationId, assignments } };
        }),
      assignToSlot: (slotId, playerId) =>
        set((s) => {
          const a: Assignments = { ...s.draft.assignments };
          // a player can only stand in one slot
          for (const k of Object.keys(a)) if (a[k] === playerId) a[k] = null;
          a[slotId] = playerId;
          return { draft: { ...s.draft, assignments: a } };
        }),
      swapSlots: (x, y) =>
        set((s) => {
          const a: Assignments = { ...s.draft.assignments };
          [a[x], a[y]] = [a[y] ?? null, a[x] ?? null];
          return { draft: { ...s.draft, assignments: a } };
        }),
      clearSlot: (slotId) =>
        set((s) => ({ draft: { ...s.draft, assignments: { ...s.draft.assignments, [slotId]: null } } })),
      clearDraft: () =>
        set((s) => {
          const f = s.formations.find((x) => x.id === s.draft.formationId) ?? s.formations[0];
          return { draft: { ...s.draft, lineupId: null, name: '', assignments: emptyAssignments(f) } };
        }),

      saveDraftAs: (name) => {
        const id = newId('l');
        const now = Date.now();
        set((s) => ({
          lineups: [
            ...s.lineups,
            { id, name: name.trim(), formationId: s.draft.formationId, assignments: s.draft.assignments, createdAt: now, updatedAt: now },
          ],
          draft: { ...s.draft, lineupId: id, name: name.trim() },
        }));
        return id;
      },
      saveDraft: () => {
        const { draft } = get();
        if (!draft.lineupId) return;
        set((s) => ({
          lineups: s.lineups.map((l) =>
            l.id === draft.lineupId
              ? { ...l, formationId: draft.formationId, assignments: draft.assignments, updatedAt: Date.now() }
              : l,
          ),
        }));
      },
      loadLineup: (lineupId) =>
        set((s) => {
          const l = s.lineups.find((x) => x.id === lineupId);
          if (!l) return {};
          const f = s.formations.find((x) => x.id === l.formationId) ?? s.formations[0];
          return {
            draft: {
              ...s.draft,
              lineupId: l.id,
              name: l.name,
              formationId: f.id,
              assignments: { ...emptyAssignments(f), ...l.assignments },
              matchId: l.matchId ?? null,
            },
          };
        }),
      duplicateLineup: (lineupId) =>
        set((s) => {
          const l = s.lineups.find((x) => x.id === lineupId);
          if (!l) return {};
          const now = Date.now();
          return { lineups: [...s.lineups, { ...l, id: newId('l'), name: `${l.name} (kopie)`, createdAt: now, updatedAt: now }] };
        }),
      deleteLineup: (lineupId) =>
        set((s) => ({
          lineups: s.lineups.filter((l) => l.id !== lineupId),
          draft: s.draft.lineupId === lineupId ? { ...s.draft, lineupId: null } : s.draft,
          matches: s.matches.map((m) => (m.startingLineupId === lineupId ? { ...m, startingLineupId: null } : m)),
        })),
      renameLineup: (lineupId, name) =>
        set((s) => ({
          lineups: s.lineups.map((l) => (l.id === lineupId ? { ...l, name: name.trim(), updatedAt: Date.now() } : l)),
          draft: s.draft.lineupId === lineupId ? { ...s.draft, name: name.trim() } : s.draft,
        })),

      createMatch: (input, startingLineupId = null) => {
        const id = newId('m');
        set((s) => ({
          matches: [
            ...s.matches,
            {
              id,
              ...input,
              opponent: input.opponent.trim(),
              // default: everyone in the squad is present, the coach taps the absent ones off
              availablePlayerIds: s.players.filter((p) => p.active).map((p) => p.id),
              startingLineupId,
              events: [],
              status: 'planned',
              rotationGroups: {},
            },
          ],
          activeMatchId: id,
          matchDetailId: id,
        }));
        return id;
      },
      updateMatch: (id, patch) =>
        set((s) => ({ matches: s.matches.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      deleteMatch: (id) =>
        set((s) => ({
          matches: s.matches.filter((m) => m.id !== id),
          lineups: s.lineups.filter((l) => l.matchId !== id),
          activeMatchId: s.activeMatchId === id ? null : s.activeMatchId,
          matchDetailId: s.matchDetailId === id ? null : s.matchDetailId,
          draft: s.draft.matchId === id ? emptyDraft(s.formations) : s.draft,
        })),
      toggleAvailability: (matchId, playerId) =>
        set((s) => ({
          matches: s.matches.map((m) => {
            if (m.id !== matchId) return m;
            const has = m.availablePlayerIds.includes(playerId);
            return { ...m, availablePlayerIds: has ? m.availablePlayerIds.filter((x) => x !== playerId) : [...m.availablePlayerIds, playerId] };
          }),
        })),
      setStartingLineup: (matchId, lineupId) =>
        set((s) => ({ matches: s.matches.map((m) => (m.id === matchId ? { ...m, startingLineupId: lineupId } : m)) })),
      createMatchLineup: (matchId, formationId) => {
        const s = get();
        const match = s.matches.find((m) => m.id === matchId);
        const f = s.formations.find((x) => x.id === formationId);
        if (!match || !f) return;
        const id = newId('l');
        const now = Date.now();
        const lineup: Lineup = {
          id,
          name: matchLineupName(match),
          formationId,
          assignments: emptyAssignments(f),
          createdAt: now,
          updatedAt: now,
          matchId,
        };
        set((st) => ({
          lineups: [...st.lineups.filter((l) => !(l.matchId === matchId)), lineup],
          matches: st.matches.map((m) => (m.id === matchId ? { ...m, startingLineupId: id } : m)),
          draft: { lineupId: id, name: lineup.name, formationId, assignments: lineup.assignments, matchId },
          tab: 'lineup',
          lineupView: 'editor',
        }));
      },
      editMatchLineup: (matchId) => {
        const s = get();
        const match = s.matches.find((m) => m.id === matchId);
        if (!match || !match.startingLineupId) return;
        let lineup = s.lineups.find((l) => l.id === match.startingLineupId);
        if (!lineup) return;
        const f = s.formations.find((x) => x.id === lineup!.formationId) ?? s.formations[0];
        let lineups = s.lineups;
        if (lineup.matchId !== matchId) {
          // copy the template for this match; drop any previous match copy
          const now = Date.now();
          lineup = { ...lineup, id: newId('l'), name: matchLineupName(match), createdAt: now, updatedAt: now, matchId };
          lineups = [...s.lineups.filter((l) => l.matchId !== matchId), lineup];
        }
        set({
          lineups,
          matches: s.matches.map((m) => (m.id === matchId ? { ...m, startingLineupId: lineup!.id } : m)),
          draft: {
            lineupId: lineup.id,
            name: lineup.name,
            formationId: f.id,
            assignments: { ...emptyAssignments(f), ...lineup.assignments },
            matchId,
          },
          tab: 'lineup',
          lineupView: 'editor',
        });
      },
      leaveMatchEditing: () => set((s) => ({ draft: emptyDraft(s.formations), tab: 'match', matchDetailId: s.draft.matchId, lineupView: 'list' })),

      setRotationPartner: (matchId, playerId, slotId) =>
        patchMatch(set, matchId, (m) => ({ ...m, rotationGroups: setPartner(m.rotationGroups, playerId, slotId) })),
      autoPlanRotation: (matchId) => {
        const s = get();
        const match = s.matches.find((m) => m.id === matchId);
        if (!match) return;
        patchMatch(set, matchId, (m) => ({ ...m, rotationGroups: autoGroups(m, s) }));
      },

      startMatch: (matchId) => {
        const s = get();
        const match = s.matches.find((m) => m.id === matchId);
        if (!match || match.status !== 'planned') return;
        const starting = startingLineup(match, s.lineups, s.formations, s.players);
        const at = Date.now();
        const events: MatchEvent[] = Object.entries(starting.assignments)
          .filter((e): e is [string, string] => !!e[1])
          .map(([slotId, playerId]) => ({ type: 'PLAYER_ON', at, playerId, slotId }));
        patchMatch(set, matchId, (m) => ({
          ...m,
          status: 'live',
          events: [...m.events, ...events],
          // no plan prepared → plan now, so the one-button rotation works anyway
          rotationGroups: Object.keys(m.rotationGroups ?? {}).length ? m.rotationGroups : autoGroups(m, s),
        }));
        set({ activeMatchId: matchId, tab: 'live' });
      },
      startPeriod: (matchId, period) =>
        patchMatch(set, matchId, (m) => {
          if (m.status !== 'live' || clockState(m).kind === 'running') return m;
          return { ...m, events: [...m.events, { type: 'PERIOD_START', period, at: Date.now() }] };
        }),
      endPeriod: (matchId) =>
        patchMatch(set, matchId, (m) => {
          const st = clockState(m);
          if (st.kind !== 'running') return m;
          return { ...m, events: [...m.events, { type: 'PERIOD_END', period: st.period, at: Date.now() }] };
        }),
      substitute: (matchId, subs) =>
        patchMatch(set, matchId, (m) => {
          if (m.status !== 'live' || subs.length === 0) return m;
          const at = Date.now();
          return {
            ...m,
            events: [...m.events, ...subs.map((x) => ({ type: 'SUB' as const, at, ...x }))],
            rotationGroups: absorbSubs(m.rotationGroups ?? {}, subs),
          };
        }),
      playerOn: (matchId, playerId, slotId) =>
        patchMatch(set, matchId, (m) => (m.status === 'live' ? { ...m, events: [...m.events, { type: 'PLAYER_ON', at: Date.now(), playerId, slotId }] } : m)),
      playerOff: (matchId, playerId) =>
        patchMatch(set, matchId, (m) => (m.status === 'live' ? { ...m, events: [...m.events, { type: 'PLAYER_OFF', at: Date.now(), playerId }] } : m)),
      undoLastEvent: (matchId) => patchMatch(set, matchId, (m) => (m.status === 'live' ? { ...m, events: withoutLastBatch(m.events) } : m)),
      finishMatch: (matchId) =>
        patchMatch(set, matchId, (m) => {
          if (m.status !== 'live') return m;
          const st = clockState(m);
          const events = st.kind === 'running' ? [...m.events, { type: 'PERIOD_END' as const, period: st.period, at: Date.now() }] : m.events;
          return { ...m, events, status: 'finished' };
        }),

      addFormation: (f) => set((s) => ({ formations: [...s.formations, f] })),
      deleteFormation: (formationId) =>
        set((s) => {
          if (s.formations.length <= 1) return {};
          const formations = s.formations.filter((f) => f.id !== formationId);
          const fallback = formations.find((f) => f.id === DEFAULT_FORMATION_ID) ?? formations[0];
          let draft = s.draft;
          if (draft.formationId === formationId) {
            const from = s.formations.find((f) => f.id === formationId)!;
            draft = { ...draft, formationId: fallback.id, assignments: remapAssignments(from, fallback, draft.assignments) };
          }
          return { formations, draft };
        }),
    }),
    {
      name: STORAGE_KEY,
      version: SEED_REVISION,
      storage: createJSONStorage(() => localStorage),
      /**
       * Seed roster changed (e.g. team A got positions, duplicates removed).
       * A store that has not been used yet – no matches, no lineups – takes
       * the new seed; anything with real data is left alone.
       */
      migrate: (persisted, fromVersion) => {
        const s = persisted as Partial<AppData>;
        if (fromVersion < SEED_REVISION && (s.matches?.length ?? 0) === 0 && (s.lineups?.length ?? 0) === 0) {
          return { ...s, players: SEED_PLAYERS_BY_TEAM[ACTIVE_TEAM] } as AppState;
        }
        return persisted as AppState;
      },
      partialize: (s) => ({ ...pickData(s), draft: s.draft, tab: s.tab, activeMatchId: s.activeMatchId, matchDetailId: s.matchDetailId, lineupView: s.lineupView }),
    },
  ),
);
