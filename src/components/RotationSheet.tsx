import { useState } from 'react';
import { Btn, Modal } from './Modal';
import { RoleSquare } from './RoleChip';
import { IconClose } from './icons';
import { cyclePairOff, proposeRotation, type RotationInput, type RotationPair } from '../lib/rotation';

export function RotationSheet({ input, initialPairs, onConfirm, onClose }: { input: RotationInput; initialPairs?: RotationPair[]; onConfirm: (pairs: RotationPair[]) => void; onClose: () => void }) {
  const [pairs, setPairs] = useState<RotationPair[]>(() => initialPairs ?? proposeRotation(input));
  const byId = new Map(input.players.map((p) => [p.id, p]));
  const slotRole = (slotId: string) => input.formation.slots.find((s) => s.id === slotId)?.role;
  const name = (id: string) => byId.get(id)?.name ?? id;
  return (
    <Modal title="Návrh rotace" subtitle="Tap na hráče vpravo přepne, koho střídá" onClose={onClose}>
      {pairs.length === 0 && <p className="text-muted">Nikdo na lavičce, koho by šlo nasadit.</p>}
      <ul className="no-touch-fx flex flex-col gap-2">
        {pairs.map((pair, i) => {
          const role = slotRole(pair.slotId);
          return (
            <li key={pair.onPlayerId} className="flex items-center gap-2.5 rounded-[18px] border border-line bg-surface px-3 py-2.5">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {role && <RoleSquare role={role} size={30} />}
                <span className="block truncate text-[15px] font-bold text-ink">
                  {name(pair.onPlayerId)} <span className="text-role-midc-text">▲</span>
                </span>
              </span>
              <button type="button" onClick={() => setPairs((ps) => cyclePairOff(input, ps, i))} className="tap rounded-xl border border-line-2 bg-surface-3 px-3 text-left" aria-label={`Změnit odcházejícího hráče pro ${name(pair.onPlayerId)}`}>
                <span className="block text-[13px] font-bold text-ink">{name(pair.offPlayerId)} ▼</span>
                <span className="block text-[10px] font-bold text-muted">tap = jiný</span>
              </button>
              <button type="button" onClick={() => setPairs((ps) => ps.filter((_, j) => j !== i))} className="tap flex size-11 shrink-0 items-center justify-center rounded-xl border border-line-2 bg-surface text-faint" aria-label={`Vyřadit střídání ${name(pair.onPlayerId)}`}>
                <IconClose size={16} />
              </button>
            </li>
          );
        })}
      </ul>
      <Btn kind="accent" className="mt-3.5 min-h-[60px] w-full rounded-[20px] text-[17px] font-extrabold tracking-[-0.01em]" disabled={pairs.length === 0} onClick={() => onConfirm(pairs)}>
        Provést {pairs.length} střídání
      </Btn>
    </Modal>
  );
}
