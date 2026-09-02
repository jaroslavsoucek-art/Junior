import { Pitch } from './Pitch';
import { SlotMarker } from './SlotMarker';
import type { Formation, Player } from '../types';
import type { Assignments } from '../lib/lineup';
import { toPitch } from '../lib/pitchGeometry';

const ROLE_FILL = { GK: 'var(--role-gk)', DEF: 'var(--role-def)', MID_C: 'var(--role-midc)', MID_W: 'var(--role-midw)', FWD: 'var(--role-fwd)' } as const;

/** Read-only pitch with the effective starting lineup; flagged slots = saved player is absent. */
export function LineupPreview({
  formation,
  assignments,
  missingSlotIds,
  players,
  onTap,
  className = '',
}: {
  formation: Formation;
  assignments: Assignments;
  missingSlotIds: string[];
  players: Player[];
  onTap?: () => void;
  className?: string;
}) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const missing = new Set(missingSlotIds);
  return (
    <div className={`aspect-[2/3] overflow-hidden rounded-[14px] ${className}`} onClick={onTap} role={onTap ? 'button' : undefined}>
      <Pitch>
        {formation.slots.map((slot) => {
          const pid = assignments[slot.id] ?? null;
          return <SlotMarker key={slot.id} slot={slot} player={pid ? (byId.get(pid) ?? null) : null} visual={missing.has(slot.id) ? 'missing' : 'normal'} />;
        })}
      </Pitch>
    </div>
  );
}

/** Tiny thumbnail (44 × 66): coloured dots only, dashed gold for empty/missing slots. */
export function LineupThumb({ formation, assignments, missingSlotIds = [], className = '' }: { formation: Formation; assignments: Assignments; missingSlotIds?: string[]; className?: string }) {
  const missing = new Set(missingSlotIds);
  return (
    <svg viewBox="0 0 100 150" preserveAspectRatio="xMidYMid meet" className={`block h-full w-full ${className}`} aria-hidden>
      <rect x="0" y="0" width="100" height="150" fill="var(--pitch)" />
      <line x1="0" y1="75" x2="100" y2="75" stroke="var(--pitch-line)" strokeWidth="1.2" opacity="0.6" />
      {formation.slots.map((s) => {
        const { cx, cy } = toPitch(s.x, s.y);
        const filled = !!assignments[s.id] && !missing.has(s.id);
        return filled ? (
          <circle key={s.id} cx={cx} cy={cy} r="7" fill={ROLE_FILL[s.role]} />
        ) : (
          <circle key={s.id} cx={cx} cy={cy} r="6.5" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeDasharray="2.5 2" />
        );
      })}
    </svg>
  );
}
