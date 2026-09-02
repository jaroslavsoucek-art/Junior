export type PositionRole = 'GK' | 'DEF' | 'MID_C' | 'MID_W' | 'FWD';

export type Player = {
  id: string;
  name: string;
  roles: PositionRole[]; // hráč může mít víc rolí; prázdné = post zatím nezadán
  active: boolean; // trvale v kádru (ne docházka)
  team?: 'A' | 'B'; // domovský tým hráče (hostující hráč z druhého týmu má jiný než aktivní)
};

export type FormationSlot = {
  id: string;
  role: PositionRole; // preferovaná role pro tento slot
  x: number; // 0..1, šířka hřiště
  y: number; // 0..1, 0 = vlastní branka, 1 = soupeřova
};

export type Formation = {
  id: string;
  name: string; // "2-3-2"
  slots: FormationSlot[]; // vždy přesně 8 (1× GK + 7)
};

export type Lineup = {
  id: string;
  name: string; // "základ", "bez Ondry", "na silného soupeře"
  formationId: string;
  assignments: Record<string, string | null>; // slotId -> playerId
  createdAt: number;
  updatedAt: number;
  matchId?: string; // sestava upravená pro konkrétní zápas (kopie šablony), šablony toto pole nemají
};

// Docházka je vázaná na konkrétní zápas, ne globální
export type Match = {
  id: string;
  opponent: string;
  date: string; // ISO
  halfLengthMin: number; // konfigurovatelné, default 30
  halvesCount: number; // default 2 (některé soutěže 3× 20)
  availablePlayerIds: string[];
  startingLineupId: string | null;
  events: MatchEvent[]; // event-sourced
  status: 'planned' | 'live' | 'finished';
  // Rotace lavičky: každých N minut appka navrhne tolik střídání, kolik je hráčů na lavičce.
  rotationIntervalMin: number; // default 5
  rotateGoalkeeper: boolean; // default false – brankář se netočí
  // Plán střídání: slotId -> hráči, kteří se na tomto postu točí (starter + náhradníci).
  rotationGroups: Record<string, string[]>;
};

// Pořadí událostí – appka neměří čas, `at` slouží jen k řazení a k undo dávek.
export type MatchEvent =
  | { type: 'SUB'; at: number; onPlayerId: string; offPlayerId: string; slotId: string }
  | { type: 'PLAYER_ON'; at: number; playerId: string; slotId: string }
  | { type: 'PLAYER_OFF'; at: number; playerId: string };

export type Settings = {
  defaultHalfLengthMin: number;
  defaultHalvesCount: number;
  defaultRotationIntervalMin: number;
  wakeLockNoticeShown: boolean;
  theme?: 'light' | 'dark' | 'system'; // vzhled, default light (na slunci čitelnější)
  // Cloud sync (Firebase) – volitelné
  clubCode?: string; // sdílený kód klubu
  deviceName?: string; // jméno tohoto telefonu v cloudu („Jarda iPhone“)
  lastUploadAt?: number; // kdy tento telefon naposledy nahrál
  lastDownloadAt?: number; // kdy naposledy stáhl (updatedAt stažené verze)
};

export const ROLE_LABEL: Record<PositionRole, string> = {
  GK: 'Brankář',
  DEF: 'Obrana',
  MID_C: 'Střed',
  MID_W: 'Křídlo',
  FWD: 'Útok',
};

export const ROLE_SHORT: Record<PositionRole, string> = {
  GK: 'GK',
  DEF: 'OB',
  MID_C: 'SZ',
  MID_W: 'KŘ',
  FWD: 'ÚT',
};

/** Posty, které se při rotaci považují za zaměnitelné (stejná skupina). */
export const ROLE_GROUP: Record<PositionRole, 'GK' | 'DEF' | 'MID' | 'FWD'> = {
  GK: 'GK',
  DEF: 'DEF',
  MID_C: 'MID',
  MID_W: 'MID',
  FWD: 'FWD',
};

export const ALL_ROLES: PositionRole[] = ['GK', 'DEF', 'MID_C', 'MID_W', 'FWD'];
