import { useState } from 'react';
import { Btn, Modal } from './Modal';
import { Stepper } from './Stepper';
import { SwitchRow } from './Switch';
import type { MatchInput } from '../store';
import { todayISO } from '../lib/match';

export function MatchForm({ initial, title, onSave, onClose, submitLabel }: { initial: MatchInput; title: string; onSave: (input: MatchInput) => void; onClose: () => void; submitLabel?: string }) {
  const [v, setV] = useState<MatchInput>(initial);
  const valid = v.opponent.trim().length > 0 && v.date.length > 0;
  const field = 'tap min-h-[52px] w-full rounded-2xl border border-line-2 bg-surface px-3.5 text-[17px] font-semibold text-ink';

  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="flex flex-col gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave({ ...v, opponent: v.opponent.trim() });
        }}
      >
        <label className="block">
          <span className="eyebrow mb-1.5 block">Soupeř</span>
          <input autoFocus={!initial.opponent} value={v.opponent} onChange={(e) => setV({ ...v, opponent: e.target.value })} className={field} enterKeyHint="next" placeholder="Slavia B" />
        </label>
        <label className="block">
          <span className="eyebrow mb-1.5 block">Datum</span>
          <input type="date" value={v.date || todayISO()} onChange={(e) => setV({ ...v, date: e.target.value })} className={field} />
        </label>
        <div className="mt-1 flex flex-col gap-2.5">
          <Row label="Délka půle">
            <Stepper label="Délka půle" value={v.halfLengthMin} min={5} max={60} step={5} unit="′" onChange={(n) => setV((x) => ({ ...x, halfLengthMin: n }))} />
          </Row>
          <Row label="Počet půlí">
            <Stepper label="Počet půlí" value={v.halvesCount} min={1} max={4} onChange={(n) => setV((x) => ({ ...x, halvesCount: n }))} />
          </Row>
          <Row label="Interval rotace">
            <Stepper label="Interval rotace" value={v.rotationIntervalMin} min={1} max={30} unit="′" onChange={(n) => setV((x) => ({ ...x, rotationIntervalMin: n }))} />
          </Row>
        </div>
        <SwitchRow label="Točit i brankáře" on={v.rotateGoalkeeper} onChange={(on) => setV({ ...v, rotateGoalkeeper: on })} />
        <div className="mt-1 flex gap-2">
          <Btn onClick={onClose} className="min-h-[52px] flex-1 rounded-2xl">
            Zrušit
          </Btn>
          <Btn type="submit" kind="primary" disabled={!valid} className="min-h-[52px] flex-[1.4] rounded-2xl">
            {submitLabel ?? 'Uložit'}
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
