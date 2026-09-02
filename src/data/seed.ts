import type { Formation, FormationSlot, Player, PositionRole } from '../types';

// Tým B – původní kádr.
const B_RAW: Player[] = [
  // Brána
  { id: 'adis', name: 'Adis', roles: ['GK'], active: true },
  { id: 'nik', name: 'Nik', roles: ['GK'], active: true },
  // Obrana
  { id: 'jony', name: 'Jony', roles: ['DEF'], active: true },
  { id: 'pilka', name: 'Pilka', roles: ['DEF'], active: true },
  { id: 'richard', name: 'Richard', roles: ['DEF'], active: true },
  { id: 'adri', name: 'Adri', roles: ['DEF'], active: true },
  // Střeďáci
  { id: 'sima', name: 'Šíma', roles: ['MID_C'], active: true },
  { id: 'korci', name: 'Korči', roles: ['MID_C'], active: true },
  // Záloha / křídla
  { id: 'kristian', name: 'Kristian', roles: ['MID_W'], active: true },
  { id: 'albi', name: 'Albi', roles: ['MID_W'], active: true },
  { id: 'damian', name: 'Damian', roles: ['MID_W'], active: true },
  { id: 'honza', name: 'Honza', roles: ['MID_W'], active: true },
  { id: 'jara', name: 'Jára', roles: ['MID_W'], active: true },
  // Hrot
  { id: 'ondra', name: 'Ondra', roles: ['FWD'], active: true },
  { id: 'marian', name: 'Marian', roles: ['FWD'], active: true },
];
export const SEED_PLAYERS_B: Player[] = B_RAW.map((p) => ({ ...p, team: 'B' as const }));

// Tým A.
const A_RAW: [name: string, roles: PositionRole[]][] = [
  ['Vašek', ['GK']],
  ['Filip', ['DEF']],
  ['Mára', ['DEF']],
  ['Vojta', ['DEF']],
  ['Patrik', ['MID_C']],
  ['Petr', ['MID_C']],
  ['Kotě', ['MID_W']],
  ['Oski', ['MID_W']],
  ['Sam', ['MID_W']],
  ['Vondris', ['MID_W']],
  ['Gabriel', ['FWD']],
];
export const SEED_PLAYERS_A: Player[] = A_RAW.map(([name, roles]) => ({
  id: `a-${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()}`,
  name,
  roles,
  active: true,
  team: 'A' as const,
}));

/** Bump when a seed roster changes so stores without own data pick it up (see store migrate). */
export const SEED_REVISION = 3;

export const SEED_PLAYERS_BY_TEAM = { A: SEED_PLAYERS_A, B: SEED_PLAYERS_B };
/** @deprecated use SEED_PLAYERS_BY_TEAM – kept for tests */
export const SEED_PLAYERS = SEED_PLAYERS_B;

// y: 0 = vlastní branka, 1 = soupeřova. x: 0 = levá lajna, 1 = pravá.
type SlotSpec = [role: PositionRole, x: number, y: number];

function formation(id: string, name: string, specs: SlotSpec[]): Formation {
  const slots: FormationSlot[] = [
    { id: `${id}-gk`, role: 'GK', x: 0.5, y: 0.14 },
    ...specs.map(([role, x, y], i) => ({ id: `${id}-${i + 1}`, role, x, y })),
  ];
  if (slots.length !== 8) throw new Error(`Formation ${name} must have 8 slots`);
  return { id, name, slots };
}

export const SEED_FORMATIONS: Formation[] = [
  formation('f-2-3-2', '2-3-2', [
    ['DEF', 0.3, 0.3],
    ['DEF', 0.7, 0.3],
    ['MID_W', 0.16, 0.56],
    ['MID_C', 0.5, 0.52],
    ['MID_W', 0.84, 0.56],
    ['FWD', 0.34, 0.8],
    ['FWD', 0.66, 0.8],
  ]),
  formation('f-3-2-2', '3-2-2', [
    ['DEF', 0.2, 0.28],
    ['DEF', 0.5, 0.26],
    ['DEF', 0.8, 0.28],
    ['MID_C', 0.34, 0.55],
    ['MID_C', 0.66, 0.55],
    ['FWD', 0.34, 0.8],
    ['FWD', 0.66, 0.8],
  ]),
  formation('f-3-3-1', '3-3-1', [
    ['DEF', 0.2, 0.28],
    ['DEF', 0.5, 0.26],
    ['DEF', 0.8, 0.28],
    ['MID_W', 0.16, 0.58],
    ['MID_C', 0.5, 0.54],
    ['MID_W', 0.84, 0.58],
    ['FWD', 0.5, 0.82],
  ]),
  formation('f-2-4-1', '2-4-1', [
    ['DEF', 0.3, 0.28],
    ['DEF', 0.7, 0.28],
    ['MID_W', 0.14, 0.56],
    ['MID_C', 0.38, 0.52],
    ['MID_C', 0.62, 0.52],
    ['MID_W', 0.86, 0.56],
    ['FWD', 0.5, 0.82],
  ]),
  formation('f-3-1-2-1', '3-1-2-1', [
    ['DEF', 0.2, 0.27],
    ['DEF', 0.5, 0.25],
    ['DEF', 0.8, 0.27],
    ['MID_C', 0.5, 0.46],
    ['MID_W', 0.24, 0.64],
    ['MID_W', 0.76, 0.64],
    ['FWD', 0.5, 0.83],
  ]),
];

export const DEFAULT_FORMATION_ID = 'f-2-3-2';
