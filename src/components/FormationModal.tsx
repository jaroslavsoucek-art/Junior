import { useState } from 'react';
import { Btn, Modal } from './Modal';
import { buildCustomFormation, defaultCustomName, lineCountsTotal, type LineCounts } from '../lib/lineup';
import { newId } from '../lib/id';
import type { Formation } from '../types';
import { SEED_FORMATIONS } from '../data/seed';

export function FormationModal({
  formations,
  currentId,
  onPick,
  onAdd,
  onDelete,
  onClose,
}: {
  formations: Formation[];
  currentId: string;
  onPick: (id: string) => void;
  onAdd: (f: Formation) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState(false);
  const [counts, setCounts] = useState<LineCounts>({ DEF: 2, MID_C: 1, MID_W: 2, FWD: 2 });
  const total = lineCountsTotal(counts);
  const seedIds = new Set(SEED_FORMATIONS.map((f) => f.id));

  const bump = (k: keyof LineCounts, d: number) =>
    setCounts((c) => ({ ...c, [k]: Math.max(0, Math.min(5, c[k] + d)) }));

  return (
    <Modal title={custom ? 'Vlastní formace' : 'Formace'} onClose={onClose}>
      {!custom ? (
        <div className="flex flex-col gap-2">
          {formations.map((f) => (
            <div key={f.id} className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onPick(f.id);
                  onClose();
                }}
                className={`tap flex flex-1 items-center justify-between rounded-xl border-2 px-4 text-left text-lg font-bold ${
                  f.id === currentId ? 'border-pitch bg-pitch text-white' : 'border-ink/15 bg-white'
                }`}
              >
                <span>{f.name}</span>
                <span className={`text-sm font-normal ${f.id === currentId ? 'text-white/80' : 'text-ink-muted'}`}>
                  {describe(f)}
                </span>
              </button>
              {!seedIds.has(f.id) && (
                <button
                  type="button"
                  onClick={() => onDelete(f.id)}
                  className="tap rounded-xl border border-ink/15 bg-white px-3 text-ink-muted"
                  aria-label={`Smazat formaci ${f.name}`}
                >
                  🗑
                </button>
              )}
            </div>
          ))}
          <Btn onClick={() => setCustom(true)} className="mt-2">
            + Vlastní formace
          </Btn>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(
            [
              ['DEF', 'Obrana'],
              ['MID_C', 'Střed'],
              ['MID_W', 'Křídla'],
              ['FWD', 'Útok'],
            ] as [keyof LineCounts, string][]
          ).map(([k, label]) => (
            <div key={k} className="flex items-center justify-between">
              <span className="text-lg font-semibold">{label}</span>
              <div className="flex items-center gap-2">
                <Btn onClick={() => bump(k, -1)} disabled={counts[k] === 0} className="w-14">
                  −
                </Btn>
                <span className="w-8 text-center text-2xl font-bold tabular-nums">{counts[k]}</span>
                <Btn onClick={() => bump(k, 1)} disabled={total >= 7} className="w-14">
                  +
                </Btn>
              </div>
            </div>
          ))}
          <p className={`text-center font-semibold ${total === 7 ? 'text-pitch' : 'text-accent'}`}>
            {total} / 7 hráčů v poli {total === 7 ? `· ${defaultCustomName(counts)}` : ''}
          </p>
          <div className="flex gap-2">
            <Btn onClick={() => setCustom(false)} className="flex-1">
              Zpět
            </Btn>
            <Btn
              kind="primary"
              disabled={total !== 7}
              className="flex-1"
              onClick={() => {
                const id = newId('f');
                const name = `${defaultCustomName(counts)}${counts.MID_W ? ` (${counts.MID_W}K)` : ''}`;
                const f = buildCustomFormation(id, name, counts);
                onAdd(f);
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

function describe(f: Formation): string {
  const c = { DEF: 0, MID_C: 0, MID_W: 0, FWD: 0 };
  for (const s of f.slots) if (s.role !== 'GK') c[s.role]++;
  return `${c.DEF} OB · ${c.MID_C} SZ · ${c.MID_W} KŘ · ${c.FWD} ÚT`;
}
