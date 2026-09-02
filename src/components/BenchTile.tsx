import type { CSSProperties, Ref } from 'react';
import type { Player, PositionRole } from '../types';
import { RoleDot } from './RoleChip';

export type TileVisual = 'normal' | 'selected' | 'fit' | 'dim' | 'low';

export function BenchTile({
  player,
  sub,
  visual,
  onTap,
  nodeRef,
  listeners,
  style,
  attributes,
}: {
  player: Player;
  sub?: string; // e.g. "12 min"
  visual: TileVisual;
  onTap?: () => void;
  nodeRef?: Ref<HTMLButtonElement>;
  listeners?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  style?: CSSProperties;
}) {
  const border =
    visual === 'selected'
      ? 'border-accent ring-2 ring-accent'
      : visual === 'fit'
        ? 'border-pitch'
        : visual === 'low'
          ? 'border-accent'
          : 'border-ink/15';
  return (
    <button
      ref={nodeRef}
      type="button"
      onClick={onTap}
      style={style}
      {...listeners}
      {...attributes}
      className={`tap flex h-[72px] w-[88px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 bg-white px-1 ${border} ${
        visual === 'dim' ? 'opacity-40' : ''
      } ${visual === 'low' ? 'bg-accent/10' : ''}`}
    >
      <span className="max-w-full truncate text-base font-bold leading-tight">{player.name}</span>
      <span className="flex items-center gap-1">
        {player.roles.map((r: PositionRole) => (
          <RoleDot key={r} role={r} />
        ))}
        {sub && <span className="text-xs font-semibold text-ink-muted tabular-nums">{sub}</span>}
      </span>
    </button>
  );
}
