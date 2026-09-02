import { computeLoad } from '../lib/rotation';
import { formatClock } from '../lib/minutes';
import type { Player } from '../types';
import { Modal } from './Modal';

/** Load sheet: minutes vs. average for everyone available. */
export function LoadPanel({ availableIds, seconds, players, onPitchIds, open, onToggle }: { availableIds: string[]; seconds: Record<string, number>; players: Player[]; onPitchIds: Set<string>; open: boolean; onToggle: () => void }) {
  if (!open) return null;
  const { avg, rows } = computeLoad(availableIds, seconds);
  const byId = new Map(players.map((p) => [p.id, p]));
  const dev = (d: number) => {
    const m = Math.round(d / 60);
    return m === 0 ? '±0 min' : m > 0 ? `+${m} min` : `−${-m} min`;
  };
  return (
    <Modal title="Vytížení" subtitle={`průměr ${formatClock(avg)} · ● na hřišti · ○ na lavičce`} onClose={onToggle}>
      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <li key={r.playerId} className={`flex items-center justify-between rounded-2xl border px-3.5 py-2.5 ${r.low ? 'border-accent-line bg-accent-soft' : 'border-line bg-surface'}`}>
            <span className="flex items-center gap-2.5">
              <span className={`inline-block size-2.5 rounded-full ${onPitchIds.has(r.playerId) ? 'bg-role-midc' : 'bg-line-2'}`} aria-hidden />
              <span className={`text-[16px] font-bold ${r.low ? 'text-accent-text' : 'text-ink'}`}>{byId.get(r.playerId)?.name ?? r.playerId}</span>
            </span>
            <span className="tabular flex items-baseline gap-3">
              <span className={`text-[16px] font-extrabold ${r.low ? 'text-accent-text' : 'text-ink'}`}>{formatClock(r.seconds)}</span>
              <span className="inline-block w-16 text-right text-[12px] font-bold text-muted">{dev(r.deviation)}</span>
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
