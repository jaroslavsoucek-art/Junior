import { useState } from 'react';
import { ALL_ROLES, ROLE_SHORT, type Player, type PositionRole } from '../types';
import { ROLE_BG } from '../lib/roleStyles';
import { Btn, Modal } from './Modal';
import { SwitchRow } from './Switch';

export function PlayerEditor({ player, onSave, onClose }: { player: Player | null; onSave: (name: string, roles: PositionRole[], active: boolean) => void; onClose: () => void }) {
  const [name, setName] = useState(player?.name ?? '');
  const [roles, setRoles] = useState<PositionRole[]>(player?.roles ?? []);
  const [active, setActive] = useState(player?.active ?? true);
  const toggleRole = (r: PositionRole) => setRoles((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]));
  const valid = name.trim().length > 0;

  return (
    <Modal title={player ? `Hráč · ${player.name}` : 'Nový hráč'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(name.trim(), roles, active);
        }}
        className="flex flex-col gap-3.5"
      >
        <label className="block">
          <span className="eyebrow mb-1.5 block">Jméno</span>
          <input autoFocus={!player} value={name} onChange={(e) => setName(e.target.value)} className="tap min-h-[52px] w-full rounded-2xl border border-line-2 bg-surface px-3.5 text-[17px] font-semibold text-ink" enterKeyHint="done" />
        </label>
        <div>
          <span className="eyebrow mb-2 block">Posty</span>
          <div className="no-touch-fx flex flex-wrap gap-2">
            {ALL_ROLES.map((r) => {
              const on = roles.includes(r);
              return (
                <button key={r} type="button" onClick={() => toggleRole(r)} aria-pressed={on} className={`tap min-h-12 rounded-[14px] px-4 text-[14px] ${on ? `${ROLE_BG[r]} font-extrabold text-white` : 'border border-line-2 bg-surface font-bold text-muted'}`}>
                  {ROLE_SHORT[r]}
                </button>
              );
            })}
          </div>
          {roles.length === 0 && <p className="mt-1.5 text-[11px] font-semibold text-faint">Bez postu – v návrzích se hodí kamkoli, nikde přednostně.</p>}
        </div>
        {player && <SwitchRow label="V kádru" on={active} onChange={setActive} />}
        <div className="flex gap-2">
          <Btn onClick={onClose} className="min-h-[52px] flex-1 rounded-2xl">
            Zrušit
          </Btn>
          <Btn type="submit" kind="primary" disabled={!valid} className="min-h-[52px] flex-[1.4] rounded-2xl">
            Uložit
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
