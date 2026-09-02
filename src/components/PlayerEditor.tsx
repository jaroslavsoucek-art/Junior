import { useState } from 'react';
import { ALL_ROLES, ROLE_LABEL, ROLE_SHORT, type Player, type PositionRole } from '../types';
import { ROLE_BG } from '../lib/roleStyles';
import { Btn, Modal } from './Modal';

export function PlayerEditor({ player, onSave, onClose }: { player: Player | null; onSave: (name: string, roles: PositionRole[], active: boolean) => void; onClose: () => void }) {
  const [name, setName] = useState(player?.name ?? '');
  const [roles, setRoles] = useState<PositionRole[]>(player?.roles ?? []);
  const [active, setActive] = useState(player?.active ?? true);
  const toggleRole = (r: PositionRole) => setRoles((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]));
  const valid = name.trim().length > 0;

  return (
    <Modal title={player ? 'Upravit hráče' : 'Nový hráč'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(name.trim(), roles, active);
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Jméno</span>
          <input autoFocus={!player} value={name} onChange={(e) => setName(e.target.value)} className="tap rounded-[14px] border border-line-2 bg-surface px-4 text-[17px] font-bold text-ink" enterKeyHint="done" />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">Posty (může být víc, může zůstat prázdné)</span>
          <div className="no-touch-fx flex flex-wrap gap-2">
            {ALL_ROLES.map((r) => {
              const on = roles.includes(r);
              return (
                <button key={r} type="button" onClick={() => toggleRole(r)} aria-pressed={on} className={`tap rounded-[14px] border-2 px-3.5 text-[14px] font-bold ${on ? `${ROLE_BG[r]} border-transparent text-white` : 'border-line-2 bg-surface text-ink'}`}>
                  {ROLE_SHORT[r]} · {ROLE_LABEL[r]}
                </button>
              );
            })}
          </div>
        </div>
        {player && (
          <button type="button" onClick={() => setActive((a) => !a)} aria-pressed={active} className={`tap flex min-h-12 items-center justify-between rounded-[14px] border px-4 text-left ${active ? 'border-line-2 bg-surface' : 'border-accent-line bg-accent-soft'}`}>
            <span className={`text-[14px] font-bold ${active ? 'text-ink' : 'text-accent-text'}`}>{active ? 'V kádru' : 'Mimo kádr (deaktivován)'}</span>
            <span className="text-[11px] font-extrabold tracking-[0.06em] text-muted">TAP = PŘEPNOUT</span>
          </button>
        )}
        <div className="flex gap-2">
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
