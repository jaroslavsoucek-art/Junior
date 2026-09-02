import { Btn } from './Modal';
import { RoleDot } from './RoleChip';
import { roleFit } from '../lib/lineup';
import { sanitizeGroups, type RotationGroups } from '../lib/rotation';
import type { StartingLineup } from '../lib/match';
import { ROLE_SHORT, type Match, type Player } from '../types';

/**
 * Pre-match plan: every bench player gets a position he rotates into.
 * One row per bench player; tapping the right side cycles through slots
 * (best position fit first), the last option is "netočí se".
 */
export function RotationPlan({
  match,
  starting,
  players,
  onSet,
  onAuto,
  locked,
}: {
  match: Match;
  starting: StartingLineup;
  players: Player[];
  onSet: (playerId: string, slotId: string | null) => void;
  onAuto: () => void;
  locked: boolean;
}) {
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

  const options = (p: Player): (string | null)[] => {
    const slots = formation.slots
      .filter((s) => starting.assignments[s.id] && (match.rotateGoalkeeper || s.role !== 'GK'))
      .sort((a, b) => roleFit(p, b.role) - roleFit(p, a.role))
      .map((s) => s.id);
    return [...slots, null];
  };
  const cycle = (p: Player) => {
    const opts = options(p);
    const i = opts.indexOf(slotOf(p.id));
    onSet(p.id, opts[(i + 1) % opts.length]);
  };

  const planned = bench.filter((p) => slotOf(p.id)).length;

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-3">
      <p className="mb-2 text-sm text-ink-muted">
        Kdo za koho se točí. V Live pak stačí jedno tlačítko „Provést rotaci“; kdo hraje nejmíň, jde první. Tap na pravou část řádku změní post.
      </p>
      {bench.length === 0 && <p className="text-ink-muted">Nikdo na lavičce – všech {match.availablePlayerIds.length} hraje od začátku.</p>}
      <ul className="flex flex-col gap-2 no-touch-fx">
        {bench.map((p) => {
          const slot = slotOf(p.id);
          const r = slot ? role(slot) : undefined;
          return (
            <li key={p.id} className="flex items-stretch gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-ink/10 px-3">
                <span className="truncate text-lg font-bold">{p.name}</span>
                <span className="flex gap-1">
                  {p.roles.map((x) => (
                    <RoleDot key={x} role={x} />
                  ))}
                </span>
              </div>
              <button
                type="button"
                disabled={locked}
                onClick={() => cycle(p)}
                className={`tap flex min-w-0 flex-1 flex-col justify-center rounded-xl border-2 px-3 text-left ${
                  slot ? 'border-primary/30 bg-primary/5' : 'border-dashed border-ink/20 text-ink-muted'
                } disabled:opacity-70`}
                aria-label={`Post pro ${p.name}`}
              >
                {slot ? (
                  <>
                    <span className="truncate font-bold">↔ {occupant(slot)}</span>
                    <span className="text-xs text-ink-muted">
                      {r ? ROLE_SHORT[r] : ''} {roleFit(p, r ?? 'FWD') === 2 ? '· jeho post' : roleFit(p, r ?? 'FWD') === 1 ? '· příbuzný post' : '· jiný post'}
                    </span>
                  </>
                ) : (
                  <span className="font-semibold">netočí se</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {!locked && bench.length > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-ink-muted">
            V plánu {planned} / {bench.length}
          </span>
          <Btn onClick={onAuto} className="px-3 py-2 text-sm">
            Navrhnout podle postů
          </Btn>
        </div>
      )}
    </div>
  );
}
