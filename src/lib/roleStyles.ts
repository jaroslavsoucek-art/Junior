import type { PositionRole } from '../types';

export const ROLE_BG: Record<PositionRole, string> = {
  GK: 'bg-role-gk',
  DEF: 'bg-role-def',
  MID_C: 'bg-role-midc',
  MID_W: 'bg-role-midw',
  FWD: 'bg-role-fwd',
};
export const ROLE_BG_SOFT: Record<PositionRole, string> = {
  GK: 'bg-role-gk/15',
  DEF: 'bg-role-def/15',
  MID_C: 'bg-role-midc/15',
  MID_W: 'bg-role-midw/15',
  FWD: 'bg-role-fwd/15',
};
export const ROLE_TEXT: Record<PositionRole, string> = {
  GK: 'text-role-gk-text',
  DEF: 'text-role-def-text',
  MID_C: 'text-role-midc-text',
  MID_W: 'text-role-midw-text',
  FWD: 'text-role-fwd-text',
};
