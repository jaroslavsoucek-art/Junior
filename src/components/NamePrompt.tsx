import { useState } from 'react';
import { Btn, Modal } from './Modal';

export function NamePrompt({ title, subtitle, initial = '', placeholder, confirmLabel = 'Uložit', onConfirm, onClose }: { title: string; subtitle?: string; initial?: string; placeholder?: string; confirmLabel?: string; onConfirm: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState(initial);
  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose}>
      <form
        className="flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onConfirm(name.trim());
        }}
      >
        <input autoFocus value={name} placeholder={placeholder} onChange={(e) => setName(e.target.value)} className="tap min-h-[52px] rounded-2xl border border-line-2 bg-surface px-3.5 text-[17px] font-semibold text-ink" enterKeyHint="done" />
        <div className="flex gap-2">
          <Btn onClick={onClose} className="min-h-[52px] flex-1 rounded-2xl">
            Zrušit
          </Btn>
          <Btn type="submit" kind="primary" className="min-h-[52px] flex-[1.4] rounded-2xl" disabled={!name.trim()}>
            {confirmLabel}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
