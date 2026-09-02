import { useState } from 'react';
import { Btn, Modal } from './Modal';
import { Stepper } from './Stepper';
import type { MatchInput } from '../store';
import { todayISO } from '../lib/match';

export function MatchForm({ initial, title, onSave, onClose }: { initial: MatchInput; title: string; onSave: (input: MatchInput) => void; onClose: () => void }) {
  const [v, setV] = useState<MatchInput>(initial);
  const valid = v.opponent.trim().length > 0 && v.date.length > 0;
  const field = 'tap w-full rounded-[14px] border border-line-2 bg-surface px-4 text-[16px] font-semibold text-ink';

  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave({ ...v, opponent: v.opponent.trim() });
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Soupeř</span>
          <input autoFocus={!initial.opponent} value={v.opponent} onChange={(e) => setV({ ...v, opponent: e.target.value })} className={field} enterKeyHint="next" placeholder="Slavia B" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Datum</span>
          <input type="date" value={v.date || todayISO()} onChange={(e) => setV({ ...v, date: e.target.value })} className={field} />
        </label>
        <div className="flex flex-col gap-2.5 rounded-[18px] border border-line bg-surface p-3.5">
          <Row label="Délka půle">
            <Stepper label="Délka půle" value={v.halfLengthMin} min={5} max={60} step={5} unit="′" onChange={(n) => setV((x) => ({ ...x, halfLengthMin: n }))} />
          </Row>
          <Row label="Počet půlí">
            <Stepper label="Počet půlí" value={v.halvesCount} min={1} max={4} onChange={(n) => setV((x) => ({ ...x, halvesCount: n }))} />
          </Row>
          <Row label="Interval rotace">
            <Stepper label="Interval rotace" value={v.rotationIntervalMin} min={1} max={30} unit="′" onChange={(n) => setV((x) => ({ ...x, rotationIntervalMin: n }))} />
          </Row>
          <button
            type="button"
            onClick={() => setV({ ...v, rotateGoalkeeper: !v.rotateGoalkeeper })}
            aria-pressed={v.rotateGoalkeeper}
            className={`tap mt-1 flex min-h-12 items-center justify-between rounded-[14px] px-3.5 text-left text-[14px] font-bold ${v.rotateGoalkeeper ? 'bg-btn text-btn-fg' : 'bg-surface-2 text-ink'}`}
          >
            <span>{v.rotateGoalkeeper ? 'Točit i brankáře' : 'Brankář se netočí'}</span>
            <span className={`text-[11px] font-extrabold tracking-[0.06em] ${v.rotateGoalkeeper ? 'opacity-80' : 'text-muted'}`}>TAP = PŘEPNOUT</span>
          </button>
        </div>
        <div className="mt-1 flex gap-2">
          <Btn onClick={onClose} className="flex-1">
            Zrušit
          </Btn>
          <Btn type="submit" kind="primary" disabled={!valid} className="flex-1">
            Uložit
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3">
      <span className="text-[15px] font-semibold text-ink">{label}</span>
      {children}
    </div>
  );
}
