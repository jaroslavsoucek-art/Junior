import { useState } from 'react';
import { Btn, Confirm, Modal } from './Modal';
import type { Formation, Lineup } from '../types';

export function LineupsModal({
  lineups,
  formations,
  currentId,
  onLoad,
  onDuplicate,
  onDelete,
  onRename,
  onClose,
}: {
  lineups: Lineup[];
  formations: Formation[];
  currentId: string | null;
  onLoad: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onClose: () => void;
}) {
  const [confirm, setConfirm] = useState<Lineup | null>(null);
  const [renaming, setRenaming] = useState<Lineup | null>(null);
  const [name, setName] = useState('');
  const sorted = [...lineups].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <Modal title="Uložené sestavy" onClose={onClose}>
      {sorted.length === 0 && <p className="text-ink-muted">Zatím žádná. Sestav osmičku a dej „Uložit“.</p>}
      <ul className="flex flex-col gap-2">
        {sorted.map((l) => {
          const f = formations.find((x) => x.id === l.formationId);
          const filled = Object.values(l.assignments).filter(Boolean).length;
          return (
            <li key={l.id} className={`rounded-xl border-2 bg-white p-2 ${l.id === currentId ? 'border-primary' : 'border-ink/10'}`}>
              <button
                type="button"
                onClick={() => {
                  onLoad(l.id);
                  onClose();
                }}
                className="tap flex w-full items-center justify-between px-2 text-left"
              >
                <span className="flex flex-col">
                  <span className="text-lg font-bold">{l.name}</span>
                  <span className="text-sm text-ink-muted">
                    {f?.name ?? '?'} · {filled}/8 · {new Date(l.updatedAt).toLocaleDateString('cs-CZ')}
                  </span>
                </span>
                <span className="font-semibold text-primary">Načíst</span>
              </button>
              <div className="mt-1 flex gap-2">
                <Btn kind="ghost" className="flex-1" onClick={() => { setRenaming(l); setName(l.name); }}>
                  Přejmenovat
                </Btn>
                <Btn kind="ghost" className="flex-1" onClick={() => onDuplicate(l.id)}>
                  Duplikovat
                </Btn>
                <Btn kind="ghost" className="flex-1 text-accent" onClick={() => setConfirm(l)}>
                  Smazat
                </Btn>
              </div>
            </li>
          );
        })}
      </ul>

      {confirm && (
        <Confirm
          title={`Smazat „${confirm.name}“?`}
          text="Uložená sestava zmizí. Zápasy, které ji používaly jako startovní, o ni přijdou."
          confirmLabel="Smazat"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            onDelete(confirm.id);
            setConfirm(null);
          }}
        />
      )}
      {renaming && (
        <Modal title="Přejmenovat sestavu">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) onRename(renaming.id, name);
              setRenaming(null);
            }}
          >
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="tap rounded-xl border border-ink/20 bg-white px-4 text-lg" />
            <div className="flex gap-2">
              <Btn onClick={() => setRenaming(null)} className="flex-1">Zrušit</Btn>
              <Btn type="submit" kind="primary" className="flex-1" disabled={!name.trim()}>Uložit</Btn>
            </div>
          </form>
        </Modal>
      )}
    </Modal>
  );
}
