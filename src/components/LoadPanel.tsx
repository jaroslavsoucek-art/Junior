import { computeLoad } from '../lib/rotation';
import { formatClock } from '../lib/minutes';
import type { Player } from '../types';
import { Modal } from './Modal';

/**
 * Collapsed: one bar with the average. Open: a bottom sheet – not inline, so
 * the pitch never gets squeezed out of view on a small phone.
 */
export function LoadPanel({
  availableIds,
  seconds,
  players,
  onPitchIds,
  open,
  onToggle,
}: {
  availableIds: string[];
  seconds: Record<string, number>;
  players: Player[];
  onPitchIds: Set<string>;
  open: boolean;
  onToggle: () => void;
}) {
  const { avg, rows } = computeLoad(availableIds, seconds);
  const byId = new Map(players.map((p) => [p.id, p]));
  const dev = (d: number) => {
    const m = Math.round(d / 60);
    return m === 0 ? '±0 min' : m > 0 ? `+${m} min` : `−${-m} min`;
  };
  return (
    <div className="border-t border-ink/10 bg-white">
      <button type="button" onClick={onToggle} aria-expanded={open} className="tap flex w-full items-center justify-between px-4 text-left">
        <span className="font-bold">Vytížení</span>
        <span className="text-sm text-ink-muted tabular-nums">
          průměr {formatClock(avg)} {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <Modal title={`Vytížení · průměr ${formatClock(avg)}`} onClose={onToggle}>
          <ul>
            {rows.map((r) => (
              <li key={r.playerId} className={`flex items-center justify-between border-t border-ink/5 py-2 ${r.low ? 'text-accent' : ''}`}>
                <span className="flex items-center gap-2">
                  <span className={`inline-block size-2.5 rounded-full ${onPitchIds.has(r.playerId) ? 'bg-primary' : 'bg-ink/20'}`} aria-hidden />
                  <span className="text-lg font-semibold">{byId.get(r.playerId)?.name ?? r.playerId}</span>
                </span>
                <span className="flex items-baseline gap-3 tabular-nums">
                  <span className="text-lg font-bold">{formatClock(r.seconds)}</span>
                  <span className="inline-block w-16 text-right text-sm text-ink-muted">{dev(r.deviation)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-muted">● na hřišti · ○ na lavičce · oranžově = výrazně pod průměrem</p>
        </Modal>
      )}
    </div>
  );
}
