import type { CSSProperties, Ref } from 'react';
import { ROLE_SHORT, type FormationSlot, type Player } from '../types';
import { toPitch } from '../lib/pitchGeometry';

const ROLE_FILL: Record<FormationSlot['role'], string> = {
  GK: 'var(--color-role-gk)',
  DEF: 'var(--color-role-def)',
  MID_C: 'var(--color-role-midc)',
  MID_W: 'var(--color-role-midw)',
  FWD: 'var(--color-role-fwd)',
};

export type SlotVisual = 'normal' | 'selected' | 'target' | 'dim' | 'missing';

/**
 * One slot on the pitch. Circle r=7.5 in a 100-wide viewBox → ~56 px on a
 * 375 px phone, plus the label pill: comfortably above the 48 px minimum.
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
  extraLabel?: string; // e.g. minutes in Live
  onTap?: () => void;
  nodeRef?: Ref<SVGGElement>;
  listeners?: Record<string, unknown>;
  style?: CSSProperties;
}) {
  const { cx, cy } = toPitch(slot.x, slot.y);
  const r = 7.5;
  const name = player?.name ?? '';
  const pillW = Math.max(16, name.length * 3.1 + 6);
  const ringColor =
    visual === 'selected'
      ? 'var(--color-accent)'
      : visual === 'target'
        ? '#ffffff'
        : visual === 'missing'
          ? 'var(--color-accent)'
          : 'rgba(255,255,255,0.85)';
  const ringWidth = visual === 'selected' || visual === 'target' ? 2 : 1;
  const opacity = visual === 'dim' ? 0.45 : 1;

  return (
    <g
      ref={nodeRef}
      {...listeners}
      style={{ cursor: 'pointer', opacity, ...style }}
      onClick={onTap}
      role="button"
      aria-label={player ? `${player.name}, ${ROLE_SHORT[slot.role]}` : `Prázdný slot ${ROLE_SHORT[slot.role]}`}
    >
      {/* invisible hit area so taps between circle and pill also count */}
      <rect x={cx - 12} y={cy - 10} width="24" height="24" fill="transparent" />
      {visual === 'target' && <circle cx={cx} cy={cy} r={r + 3} fill="#ffffff" opacity="0.35" />}
      {player ? (
        <>
          <circle cx={cx} cy={cy} r={r} fill={ROLE_FILL[slot.role]} stroke={ringColor} strokeWidth={ringWidth} />
          <text x={cx} y={cy + 1.6} textAnchor="middle" fontSize="4.6" fontWeight="700" fill="#fff">
            {ROLE_SHORT[slot.role]}
          </text>
          <rect x={cx - pillW / 2} y={cy + r + 1} width={pillW} height="7" rx="3.5" fill="#fff" stroke={visual === 'selected' ? 'var(--color-accent)' : 'none'} strokeWidth="0.8" />
          <text x={cx} y={cy + r + 6} textAnchor="middle" fontSize="4.8" fontWeight="700" fill="var(--color-ink)">
            {name}
          </text>
          {extraLabel && (
            <text x={cx} y={cy + r + 12} textAnchor="middle" fontSize="4" fontWeight="600" fill="#fff">
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
            fill={visual === 'missing' ? 'rgba(217,72,15,0.35)' : 'rgba(255,255,255,0.12)'}
            stroke={ringColor}
            strokeWidth={ringWidth}
            strokeDasharray={visual === 'missing' ? undefined : '2 1.5'}
          />
          <text x={cx} y={cy + 1.7} textAnchor="middle" fontSize="5" fontWeight="700" fill="#fff">
            {ROLE_SHORT[slot.role]}
          </text>
          {visual === 'missing' && (
            <text x={cx} y={cy + r + 6} textAnchor="middle" fontSize="4" fontWeight="700" fill="#fff">
              chybí
            </text>
          )}
        </>
      )}
    </g>
  );
}
