import { useState } from 'react';
import { Btn, Modal } from './Modal';

export function NamePrompt({ title, initial = '', placeholder, confirmLabel = 'Uložit', onConfirm, onClose }: { title: string; initial?: string; placeholder?: string; confirmLabel?: string; onConfirm: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState(initial);
  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onConfirm(name.trim());
        }}
      >
        <input autoFocus value={name} placeholder={placeholder} onChange={(e) => setName(e.target.value)} className="tap rounded-[14px] border border-line-2 bg-surface px-4 text-[16px] font-semibold text-ink" enterKeyHint="done" />
        <div className="flex gap-2">
          <Btn onClick={onClose} className="flex-1">
            Zrušit
          </Btn>
          <Btn type="submit" kind="primary" className="flex-1" disabled={!name.trim()}>
            {confirmLabel}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
