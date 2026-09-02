import { useState } from 'react';
import { Btn, Modal } from './Modal';
import { cyclePairOff, proposeRotation, type RotationInput, type RotationPair } from '../lib/rotation';
import { formatClock } from '../lib/minutes';
import { ROLE_SHORT, type Player } from '../types';

export function RotationSheet({
  input,
  initialPairs,
  onConfirm,
  onClose,
}: {
  input: RotationInput;
  initialPairs?: RotationPair[];
  onConfirm: (pairs: RotationPair[]) => void;
  onClose: () => void;
}) {
  const [pairs, setPairs] = useState<RotationPair[]>(() => initialPairs ?? proposeRotation(input));
  const byId = new Map(input.players.map((p) => [p.id, p]));
  const slotRole = (slotId: string) => input.formation.slots.find((s) => s.id === slotId)?.role;
  const name = (id: string) => byId.get(id)?.name ?? id;
  const secs = (id: string) => formatClock(input.seconds[id] ?? 0);

  return (
    <Modal title={`Rotace · ${pairs.length} střídání`} onClose={onClose}>
      {pairs.length === 0 && <p className="text-ink-muted">Nikdo na lavičce, koho by šlo nasadit.</p>}
      <ul className="flex flex-col gap-2 no-touch-fx">
        {pairs.map((pair, i) => {
          const on = byId.get(pair.onPlayerId) as Player | undefined;
          const role = slotRole(pair.slotId);
          return (
            <li key={pair.onPlayerId} className="flex items-stretch gap-2 rounded-xl border border-ink/10 bg-white p-2">
              <div className="flex min-w-0 flex-1 flex-col justify-center px-2">
                <span className="truncate text-lg font-bold text-primary">▲ {on?.name}</span>
                <span className="text-xs text-ink-muted tabular-nums">{secs(pair.onPlayerId)} odehráno</span>
              </div>
              <button
                type="button"
                onClick={() => setPairs((ps) => cyclePairOff(input, ps, i))}
                className="tap flex min-w-0 flex-1 flex-col justify-center rounded-lg border-2 border-ink/15 px-2 text-left"
                aria-label={`Změnit odcházejícího hráče pro ${on?.name}`}
              >
                <span className="truncate text-lg font-bold text-accent">▼ {name(pair.offPlayerId)}</span>
                <span className="text-xs text-ink-muted tabular-nums">
                  {role ? ROLE_SHORT[role] : ''} · {secs(pair.offPlayerId)} · tap = jiný
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPairs((ps) => ps.filter((_, j) => j !== i))}
                className="tap rounded-lg px-2 text-ink-muted"
                aria-label={`Vyřadit střídání ${on?.name}`}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex gap-2">
        <Btn onClick={onClose} className="flex-1">
          Zrušit
        </Btn>
        <Btn kind="primary" className="flex-1" disabled={pairs.length === 0} onClick={() => onConfirm(pairs)}>
          Provést ({pairs.length})
        </Btn>
      </div>
    </Modal>
  );
}
