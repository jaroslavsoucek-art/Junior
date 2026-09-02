import { ROLE_SHORT, type PositionRole } from '../types';
import { ROLE_BG, ROLE_BG_SOFT, ROLE_TEXT } from '../lib/roleStyles';

/** 38 px rounded square with the role abbreviation (design: roster rows, rotation rows). */
export function RoleSquare({ role, size = 38 }: { role: PositionRole; size?: number }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl font-extrabold ${ROLE_BG_SOFT[role]} ${ROLE_TEXT[role]}`}
      style={{ width: size, height: size, fontSize: size >= 36 ? 13 : 11, borderRadius: size >= 36 ? 12 : 10 }}
    >
      {ROLE_SHORT[role]}
    </span>
  );
}

/** Small uppercase role label (bench tiles). */
export function RoleTag({ role }: { role: PositionRole }) {
  return <span className={`text-[10px] font-extrabold tracking-[0.06em] ${ROLE_TEXT[role]}`}>{ROLE_SHORT[role]}</span>;
}

/** Legacy inline chip (used in pickers). */
export function RoleChip({ role }: { role: PositionRole }) {
  return <span className={`inline-flex h-6 min-w-8 items-center justify-center rounded-md px-1.5 text-xs font-extrabold ${ROLE_BG_SOFT[role]} ${ROLE_TEXT[role]}`}>{ROLE_SHORT[role]}</span>;
}

export function NoRoleChip() {
  return <span className="inline-flex h-6 items-center justify-center rounded-md border border-dashed border-line-2 px-1.5 text-[10px] font-bold text-muted">BEZ POSTU</span>;
}

export function TeamTag({ team }: { team: 'A' | 'B' }) {
  return <span className="inline-flex items-center rounded-md bg-gold px-[5px] py-px text-[10px] font-extrabold text-[#141728]">{team}</span>;
}

export function RoleDot({ role }: { role: PositionRole }) {
  return <span className={`inline-block size-2 rounded-full ${ROLE_BG[role]}`} aria-hidden />;
}
