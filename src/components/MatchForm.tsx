import { useState } from 'react';
import { Btn, Modal } from './Modal';
import { NumInput } from './NumInput';
import type { MatchInput } from '../store';
import { todayISO } from '../lib/match';

export function MatchForm({
  initial,
  title,
  onSave,
  onClose,
}: {
  initial: MatchInput;
  title: string;
  onSave: (input: MatchInput) => void;
  onClose: () => void;
}) {
  const [v, setV] = useState<MatchInput>(initial);
  const valid = v.opponent.trim().length > 0 && v.date.length > 0;

  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave({ ...v, opponent: v.opponent.trim() });
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink-muted">Soupeř</span>
          <input
            autoFocus={!initial.opponent}
            value={v.opponent}
            onChange={(e) => setV({ ...v, opponent: e.target.value })}
            className="tap rounded-xl border border-ink/20 bg-white px-4 text-lg"
            enterKeyHint="next"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink-muted">Datum</span>
          <input
            type="date"
            value={v.date || todayISO()}
            onChange={(e) => setV({ ...v, date: e.target.value })}
            className="tap rounded-xl border border-ink/20 bg-white px-4 text-lg"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Délka půle (min)" value={v.halfLengthMin} min={5} max={60} onChange={(n) => setV((x) => ({ ...x, halfLengthMin: n }))} />
          <NumField label="Počet půlí" value={v.halvesCount} min={1} max={4} onChange={(n) => setV((x) => ({ ...x, halvesCount: n }))} />
          <NumField label="Rotace každých (min)" value={v.rotationIntervalMin} min={1} max={30} onChange={(n) => setV((x) => ({ ...x, rotationIntervalMin: n }))} />
          <button
            type="button"
            onClick={() => setV({ ...v, rotateGoalkeeper: !v.rotateGoalkeeper })}
            aria-pressed={v.rotateGoalkeeper}
            className={`tap mt-5 rounded-xl border-2 px-3 text-left font-semibold ${v.rotateGoalkeeper ? 'border-primary bg-primary text-white' : 'border-ink/20 bg-white'}`}
          >
            {v.rotateGoalkeeper ? 'Točit i brankáře' : 'Brankář se netočí'}
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

function NumField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-ink-muted">{label}</span>
      <NumInput value={value} min={min} max={max} onChange={onChange} className="px-4" ariaLabel={label} />
    </label>
  );
}
