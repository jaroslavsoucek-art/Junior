import { Btn } from './Modal';
import { RoleTag } from './RoleChip';
import { roleFit } from '../lib/lineup';
import { sanitizeGroups, type RotationGroups } from '../lib/rotation';
import type { StartingLineup } from '../lib/match';
import { ROLE_SHORT, type Match, type Player } from '../types';

/** Plán střídání: hráč z lavičky ↔ post, na který se točí; tap přepíná posty (nejlepší fit první, pak „netočí se“). */
export function RotationPlan({ match, starting, players, onSet, onAuto, locked }: { match: Match; starting: StartingLineup; players: Player[]; onSet: (playerId: string, slotId: string | null) => void; onAuto: () => void; locked: boolean }) {
  const formation = starting.formation;
  if (!formation) return null;
  const byId = new Map(players.map((p) => [p.id, p]));
  const onPitch = new Set(Object.values(starting.assignments).filter(Boolean));
  const bench = match.availablePlayerIds
    .filter((id) => byId.has(id) && byId.get(id)!.active && !onPitch.has(id))
    .map((id) => byId.get(id)!)
    .sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  const groups: RotationGroups = sanitizeGroups(match.rotationGroups ?? {}, formation, match.availablePlayerIds);
  const slotOf = (pid: string) => Object.keys(groups).find((s) => groups[s].includes(pid)) ?? null;
  const occupant = (slotId: string) => byId.get(starting.assignments[slotId] ?? '')?.name ?? '—';
  const role = (slotId: string) => formation.slots.find((s) => s.id === slotId)?.role;
  const options = (p: Player): (string | null)[] => [
    ...formation.slots
      .filter((s) => starting.assignments[s.id] && (match.rotateGoalkeeper || s.role !== 'GK'))
      .sort((a, b) => roleFit(p, b.role) - roleFit(p, a.role))
      .map((s) => s.id),
    null,
  ];
  const cycle = (p: Player) => {
    const opts = options(p);
    onSet(p.id, opts[(opts.indexOf(slotOf(p.id)) + 1) % opts.length]);
  };
  const planned = bench.filter((p) => slotOf(p.id)).length;

  return (
    <div>
      {bench.length === 0 && <p className="text-muted">Nikdo na lavičce – všech {match.availablePlayerIds.length} hraje od začátku.</p>}
      <ul className="no-touch-fx flex flex-col gap-2">
        {bench.map((p) => {
          const slot = slotOf(p.id);
          const r = slot ? role(slot) : undefined;
          const fit = r ? roleFit(p, r) : 0;
          return (
            <li key={p.id} className="flex items-stretch gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[18px] border border-line bg-surface px-3">
                <span className="flex flex-col">
                  <span className="truncate text-[15px] font-bold text-ink">{p.name}</span>
                  <span className="flex gap-1.5">{p.roles.map((x) => <RoleTag key={x} role={x} />)}</span>
                </span>
              </div>
              <button
                type="button"
                disabled={locked}
                onClick={() => cycle(p)}
                className={`tap flex min-w-0 flex-1 flex-col justify-center rounded-[18px] border px-3 text-left disabled:opacity-70 ${slot ? 'border-primary/30 bg-primary/5' : 'border-dashed border-line-2 text-muted'}`}
                aria-label={`Post pro ${p.name}`}
              >
                {slot ? (
                  <>
                    <span className="truncate text-[14px] font-bold text-ink">↔ {occupant(slot)}</span>
                    <span className="text-[11px] font-bold text-muted">
                      {r ? ROLE_SHORT[r] : ''} · {fit === 2 ? 'jeho post' : fit === 1 ? 'příbuzný post' : 'jiný post'}
                    </span>
                  </>
                ) : (
                  <span className="text-[14px] font-bold">netočí se</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {!locked && bench.length > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[12px] font-bold text-muted">
            V plánu {planned} / {bench.length}
          </span>
          <Btn kind="soft" className="px-3 py-2 text-[13px]" onClick={onAuto}>
            Navrhnout podle postů
          </Btn>
        </div>
      )}
    </div>
  );
}
