import { useState } from 'react';
import { ALL_ROLES, ROLE_LABEL, ROLE_SHORT, type Player, type PositionRole } from '../types';
import { ROLE_BG } from '../lib/roleStyles';
import { Btn, Modal } from './Modal';

export function PlayerEditor({
  player,
  onSave,
  onClose,
}: {
  player: Player | null; // null = new player
  onSave: (name: string, roles: PositionRole[], active: boolean) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(player?.name ?? '');
  const [roles, setRoles] = useState<PositionRole[]>(player?.roles ?? []);
  const [active, setActive] = useState(player?.active ?? true);

  const toggleRole = (r: PositionRole) =>
    setRoles((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]));

  const valid = name.trim().length > 0 && roles.length > 0;

  return (
    <Modal title={player ? 'Upravit hráče' : 'Nový hráč'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(name.trim(), roles, active);
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink-muted">Jméno</span>
          <input
            autoFocus={!player}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="tap rounded-xl border border-ink/20 bg-white px-4 text-lg"
            enterKeyHint="done"
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink-muted">Posty (může být víc)</span>
          <div className="flex flex-wrap gap-2 no-touch-fx">
            {ALL_ROLES.map((r) => {
              const on = roles.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRole(r)}
                  aria-pressed={on}
                  className={`tap rounded-xl border-2 px-3 font-semibold ${
                    on ? `${ROLE_BG[r]} border-transparent text-white` : 'border-ink/20 bg-white text-ink'
                  }`}
                >
                  {ROLE_SHORT[r]} · {ROLE_LABEL[r]}
                </button>
              );
            })}
          </div>
        </div>

        {player && (
          <button
            type="button"
            onClick={() => setActive((a) => !a)}
            aria-pressed={active}
            className={`tap flex items-center justify-between rounded-xl border px-4 text-left ${
              active ? 'border-ink/20 bg-white' : 'border-accent bg-accent/10'
            }`}
          >
            <span className="font-semibold">{active ? 'V kádru' : 'Mimo kádr (deaktivován)'}</span>
            <span className="text-sm text-ink-muted">tap = přepnout</span>
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
