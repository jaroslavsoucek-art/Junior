import { Pitch } from './Pitch';
import { SlotMarker } from './SlotMarker';
import type { Formation, Player } from '../types';
import type { Assignments } from '../lib/lineup';

/** Read-only pitch with the effective starting lineup; flagged slots = saved player is absent. */
export function LineupPreview({
  formation,
  assignments,
  missingSlotIds,
  players,
  onTap,
}: {
  formation: Formation;
  assignments: Assignments;
  missingSlotIds: string[];
  players: Player[];
  onTap?: () => void;
}) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const missing = new Set(missingSlotIds);
  return (
    <div className="mx-auto aspect-[2/3] w-full max-w-[240px]" onClick={onTap} role={onTap ? 'button' : undefined}>
      <Pitch>
        {formation.slots.map((slot) => {
          const pid = assignments[slot.id] ?? null;
          return (
            <SlotMarker
              key={slot.id}
              slot={slot}
              player={pid ? (byId.get(pid) ?? null) : null}
              visual={missing.has(slot.id) ? 'missing' : 'normal'}
            />
          );
        })}
      </Pitch>
    </div>
  );
}
