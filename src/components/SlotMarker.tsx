import type { CSSProperties, Ref } from 'react';
import { ROLE_SHORT, type FormationSlot, type Player } from '../types';
import { toPitch } from '../lib/pitchGeometry';

const ROLE_FILL: Record<FormationSlot['role'], string> = {
  GK: 'var(--role-gk)',
  DEF: 'var(--role-def)',
  MID_C: 'var(--role-midc)',
  MID_W: 'var(--role-midw)',
  FWD: 'var(--role-fwd)',
};

export type SlotVisual = 'normal' | 'selected' | 'target' | 'dim' | 'missing';

/**
 * One slot on the pitch (design: r=8 role-coloured disc with the role code,
 * name pill below, optional minutes; gold ring + gold pill when selected).
 */
export function SlotMarker({
  slot,
  player,
  visual,
  extraLabel,
  onTap,
  nodeRef,
  listeners,
  style,
}: {
  slot: FormationSlot;
  player: Player | null;
  visual: SlotVisual;
  extraLabel?: string;
  onTap?: () => void;
  nodeRef?: Ref<SVGGElement>;
  listeners?: Record<string, unknown>;
  style?: CSSProperties;
}) {
  const { cx, cy } = toPitch(slot.x, slot.y);
  const r = 8;
  const name = player?.name ?? '';
  const nameW = name.length * 2.7 + 5;
  const extraW = extraLabel ? extraLabel.length * 2.3 + 3 : 0;
  const pillW = Math.max(18, nameW + extraW);
  const selected = visual === 'selected';
  const stroke = selected ? 'var(--gold)' : visual === 'missing' ? 'var(--gold)' : '#ffffff';
  const strokeW = selected ? 1.8 : 1.2;
  const pillFill = selected ? 'var(--gold)' : 'var(--pitch-label-bg)';
  const pillFg = selected ? '#141728' : 'var(--pitch-label-fg)';
  const pillMuted = selected ? '#8a6510' : 'var(--pitch-label-muted)';

  return (
    <g
      ref={nodeRef}
      {...listeners}
      style={{ cursor: 'pointer', opacity: visual === 'dim' ? 0.45 : 1, ...style }}
      onClick={onTap}
      role="button"
      aria-label={player ? `${player.name}, ${ROLE_SHORT[slot.role]}` : `Prázdný slot ${ROLE_SHORT[slot.role]}`}
    >
      <rect x={cx - 13} y={cy - 11} width="26" height="26" fill="transparent" />
      {(selected || visual === 'target') && <circle cx={cx} cy={cy} r={r + 3.5} fill={selected ? 'var(--gold)' : '#ffffff'} opacity={selected ? 0.3 : 0.35} />}
      {player ? (
        <>
          <circle cx={cx} cy={cy} r={r} fill={ROLE_FILL[slot.role]} stroke={stroke} strokeWidth={strokeW} />
          <text x={cx} y={cy + 1.8} textAnchor="middle" fontSize="5" fontWeight="800" fill="#fff">
            {ROLE_SHORT[slot.role]}
          </text>
          <rect x={cx - pillW / 2} y={cy + r + 1.5} width={pillW} height="7.5" rx="3.75" fill={pillFill} opacity={selected ? 1 : 0.95} />
          <text x={extraLabel ? cx - pillW / 2 + nameW / 2 + 0.5 : cx} y={cy + r + 6.8} textAnchor="middle" fontSize="4.6" fontWeight="700" fill={pillFg}>
            {name}
          </text>
          {extraLabel && (
            <text x={cx + pillW / 2 - extraW / 2 - 1} y={cy + r + 6.8} textAnchor="middle" fontSize="4.1" fontWeight="800" fill={pillMuted}>
              {extraLabel}
            </text>
          )}
        </>
      ) : (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={visual === 'missing' ? 'rgba(242,184,38,0.18)' : 'rgba(255,255,255,0.1)'}
            stroke={visual === 'missing' ? 'var(--gold)' : 'rgba(255,255,255,0.85)'}
            strokeWidth={visual === 'missing' ? 1.6 : 1.1}
            strokeDasharray="2.5 2"
          />
          <text x={cx} y={cy + 1.8} textAnchor="middle" fontSize="5" fontWeight="800" fill="#fff">
            {ROLE_SHORT[slot.role]}
          </text>
          {visual === 'missing' && (
            <>
              <rect x={cx - 9} y={cy + r + 1.5} width="18" height="7.5" rx="3.75" fill="var(--gold)" />
              <text x={cx} y={cy + r + 6.8} textAnchor="middle" fontSize="4.4" fontWeight="800" fill="#141728">
                chybí
              </text>
            </>
          )}
        </>
      )}
    </g>
  );
}
