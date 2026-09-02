import { useState } from 'react';
import { Btn, Modal } from './Modal';
import { buildCustomFormation, defaultCustomName, lineCountsTotal, type LineCounts } from '../lib/lineup';
import { newId } from '../lib/id';
import { ROLE_SHORT, type Formation, type PositionRole } from '../types';
import { SEED_FORMATIONS } from '../data/seed';
import { ROLE_TEXT } from '../lib/roleStyles';
import { IconTrash } from './icons';

export function FormationModal({ formations, currentId, onPick, onAdd, onDelete, onClose }: { formations: Formation[]; currentId: string; onPick: (id: string) => void; onAdd: (f: Formation) => void; onDelete: (id: string) => void; onClose: () => void }) {
  const [custom, setCustom] = useState(false);
  const [counts, setCounts] = useState<LineCounts>({ DEF: 2, MID_C: 1, MID_W: 2, FWD: 2 });
  const total = lineCountsTotal(counts);
  const seedIds = new Set(SEED_FORMATIONS.map((f) => f.id));
  const bump = (k: keyof LineCounts, d: number) => setCounts((c) => ({ ...c, [k]: Math.max(0, Math.min(5, c[k] + d)) }));
  const lines: { key: keyof LineCounts; role: PositionRole }[] = [
    { key: 'DEF', role: 'DEF' },
    { key: 'MID_C', role: 'MID_C' },
    { key: 'MID_W', role: 'MID_W' },
    { key: 'FWD', role: 'FWD' },
  ];

  return (
    <Modal title="Formace" subtitle="Změna formace nikoho neshodí — hráči se přemapují podle postů." onClose={onClose}>
      <div className="no-touch-fx grid grid-cols-3 gap-2">
        {formations.map((f) => (
          <div key={f.id} className="relative">
            <button
              type="button"
              onClick={() => {
                onPick(f.id);
                onClose();
              }}
              className={`tap min-h-14 w-full rounded-2xl text-[16px] ${f.id === currentId ? 'bg-btn font-extrabold text-btn-fg' : 'border border-line-2 bg-surface font-bold text-ink'}`}
            >
              {f.name}
            </button>
            {!seedIds.has(f.id) && (
              <button type="button" onClick={() => onDelete(f.id)} className="tap absolute -right-1 -top-1 flex size-7 min-h-7 min-w-7 items-center justify-center rounded-full border border-line-2 bg-surface text-faint" aria-label={`Smazat formaci ${f.name}`}>
                <IconTrash size={13} />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setCustom((v) => !v)} aria-expanded={custom} className={`tap min-h-14 rounded-2xl border border-dashed text-[13px] font-bold ${custom ? 'border-primary/40 bg-primary/5 text-heading' : 'border-line-2 text-muted'}`}>
          + vlastní
        </button>
      </div>

      {custom && (
        <div className="mt-4">
          <span className="eyebrow mb-2 block">Vlastní formace · součet 7</span>
          <div className="no-touch-fx grid grid-cols-4 gap-2">
            {lines.map(({ key, role }) => (
              <div key={key} className="rounded-[14px] border border-line bg-surface p-2 text-center">
                <span className={`block text-[10px] font-extrabold ${ROLE_TEXT[role]}`}>{ROLE_SHORT[role]}</span>
                <span className="tabular block text-[18px] font-extrabold text-ink">{counts[key]}</span>
                <div className="mt-1 flex justify-center gap-1">
                  <button type="button" onClick={() => bump(key, -1)} disabled={counts[key] === 0} className="tap flex size-9 min-h-9 min-w-9 items-center justify-center rounded-lg bg-surface-2 text-[16px] font-bold text-ink disabled:opacity-30" aria-label={`${ROLE_SHORT[role]} méně`}>
                    −
                  </button>
                  <button type="button" onClick={() => bump(key, 1)} disabled={total >= 7} className="tap flex size-9 min-h-9 min-w-9 items-center justify-center rounded-lg bg-surface-2 text-[16px] font-bold text-ink disabled:opacity-30" aria-label={`${ROLE_SHORT[role]} více`}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className={`text-[13px] font-bold ${total === 7 ? 'text-heading' : 'text-accent-text'}`}>
              {total} / 7 v poli{total === 7 ? ` · ${defaultCustomName(counts)}` : ''}
            </p>
            <Btn
              kind="primary"
              disabled={total !== 7}
              className="min-h-12 px-4"
              onClick={() => {
                const id = newId('f');
                const name = `${defaultCustomName(counts)}${counts.MID_W ? ` (${counts.MID_W}K)` : ''}`;
                onAdd(buildCustomFormation(id, name, counts));
                onPick(id);
                onClose();
              }}
            >
              Vytvořit
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}
