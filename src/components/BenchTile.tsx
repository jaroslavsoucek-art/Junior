import type { CSSProperties, Ref } from 'react';
import type { Player } from '../types';
import { RoleTag } from './RoleChip';

export type TileVisual = 'normal' | 'selected' | 'fit' | 'dim' | 'low';

/** Bench tile (design: 90–92 × 74–76, role tag top-left, name, minutes; gold border when selected, red when under-played). */
export function BenchTile({
  player,
  sub,
  visual,
  onTap,
  nodeRef,
  listeners,
  style,
  attributes,
  width = 92,
}: {
  player: Player;
  sub?: string;
  visual: TileVisual;
  onTap?: () => void;
  nodeRef?: Ref<HTMLButtonElement>;
  listeners?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  style?: CSSProperties;
  width?: number;
}) {
  const frame =
    visual === 'selected'
      ? 'border-2 border-gold bg-surface'
      : visual === 'low'
        ? 'border-2 border-accent bg-accent-soft'
        : visual === 'fit'
          ? 'border-2 border-primary/40 bg-surface'
          : 'border border-line-2 bg-surface';
  return (
    <button
      ref={nodeRef}
      type="button"
      onClick={onTap}
      style={{ width, ...style }}
      {...listeners}
      {...attributes}
      className={`tap flex min-h-[76px] shrink-0 flex-col items-start justify-between rounded-2xl p-2.5 text-left ${frame} ${visual === 'dim' ? 'opacity-40' : ''}`}
    >
      <span className="flex gap-1.5">{player.roles.length ? player.roles.map((r) => <RoleTag key={r} role={r} />) : <span className="text-[10px] font-extrabold tracking-[0.06em] text-faint">—</span>}</span>
      <span className="max-w-full truncate text-[14px] font-bold text-ink">{player.name}</span>
      {sub !== undefined && <span className={`tabular text-[11px] font-extrabold ${visual === 'low' ? 'text-accent-text' : 'text-muted'}`}>{sub}</span>}
    </button>
  );
}
