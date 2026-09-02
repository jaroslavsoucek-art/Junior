import { ROLE_SHORT, type PositionRole } from '../types';
import { ROLE_BG } from '../lib/roleStyles';

export function RoleChip({ role }: { role: PositionRole }) {
  return (
    <span
      className={`inline-flex h-6 min-w-8 items-center justify-center rounded px-1.5 text-xs font-bold text-white ${ROLE_BG[role]}`}
    >
      {ROLE_SHORT[role]}
    </span>
  );
}

export function RoleDot({ role }: { role: PositionRole }) {
  return <span className={`inline-block size-3 rounded-full ${ROLE_BG[role]}`} aria-hidden />;
}
