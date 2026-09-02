import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useStore } from '../store';
import { Pitch } from '../components/Pitch';
import { SlotMarker, type SlotVisual } from '../components/SlotMarker';
import { BenchTile, type TileVisual } from '../components/BenchTile';
import { FormationModal } from '../components/FormationModal';
import { LineupsModal } from '../components/LineupsModal';
import { NamePrompt } from '../components/NamePrompt';
import { MatchForm } from '../components/MatchForm';
import { todayISO } from '../lib/match';
import { Btn } from '../components/Modal';
import { orderBench, roleFit } from '../lib/lineup';
import { formatMinutes, seasonSeconds } from '../lib/season';
import type { FormationSlot, Player } from '../types';

type Sel = { kind: 'bench'; playerId: string } | { kind: 'slot'; slotId: string } | null;

export function LineupScreen() {
  const players = useStore((s) => s.players);
  const formations = useStore((s) => s.formations);
  const lineups = useStore((s) => s.lineups);
  const matches = useStore((s) => s.matches);
  const draft = useStore((s) => s.draft);
  const act = useStore();

  const [sel, setSel] = useState<Sel>(null);
  const [modal, setModal] = useState<'formation' | 'lineups' | 'saveAs' | 'newMatch' | null>(null);
  const settings = useStore((s) => s.settings);
  const [dragging, setDragging] = useState<string | null>(null);

  const formation = formations.find((f) => f.id === draft.formationId) ?? formations[0];
  const season = useMemo(() => seasonSeconds(matches), [matches]);
  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  // Bench pool: active players (or the match's available players) not on the pitch.
  const match = draft.matchId ? matches.find((m) => m.id === draft.matchId) : undefined;
  const pool = useMemo(() => {
    const base = match ? players.filter((p) => match.availablePlayerIds.includes(p.id)) : players.filter((p) => p.active);
    const onPitch = new Set(Object.values(draft.assignments).filter(Boolean));
    return base.filter((p) => !onPitch.has(p.id));
  }, [players, match, draft.assignments]);

  const selSlot = sel?.kind === 'slot' ? formation.slots.find((s) => s.id === sel.slotId) : undefined;
  const selPlayer = sel?.kind === 'bench' ? playerById.get(sel.playerId) : undefined;
  const bench = useMemo(() => orderBench(pool, season, selSlot?.role ?? null), [pool, season, selSlot]);

  // In match mode an assigned-but-absent player does not count as filled.
  const filled = Object.values(draft.assignments).filter((pid) => {
    if (!pid) return false;
    const p = playerById.get(pid);
    return !!p && p.active && (!match || match.availablePlayerIds.includes(pid));
  }).length;
  const isDirty = (() => {
    if (!draft.lineupId) return filled > 0;
    const saved = lineups.find((l) => l.id === draft.lineupId);
    return !saved || saved.formationId !== draft.formationId || JSON.stringify(saved.assignments) !== JSON.stringify(draft.assignments);
  })();

  // --- tap interaction ------------------------------------------------------
  function tapBench(playerId: string) {
    if (sel?.kind === 'slot') {
      act.assignToSlot(sel.slotId, playerId);
      setSel(null);
      return;
    }
    setSel(sel?.kind === 'bench' && sel.playerId === playerId ? null : { kind: 'bench', playerId });
  }

  function tapSlot(slotId: string) {
    if (sel?.kind === 'bench') {
      act.assignToSlot(slotId, sel.playerId);
      setSel(null);
      return;
    }
    if (sel?.kind === 'slot') {
      if (sel.slotId !== slotId) act.swapSlots(sel.slotId, slotId);
      setSel(null);
      return;
    }
    setSel({ kind: 'slot', slotId });
  }

  function slotVisual(slot: FormationSlot, player: Player | null): SlotVisual {
    if (sel?.kind === 'slot') return sel.slotId === slot.id ? 'selected' : 'normal';
    if (selPlayer) return roleFit(selPlayer, slot.role) > 0 ? 'target' : 'dim';
    if (match && draft.assignments[slot.id] && !player) return 'missing';
    return 'normal';
  }

  function tileVisual(p: Player): TileVisual {
    if (sel?.kind === 'bench') return sel.playerId === p.id ? 'selected' : 'normal';
    if (selSlot) return roleFit(p, selSlot.role) === 2 ? 'fit' : roleFit(p, selSlot.role) === 1 ? 'normal' : 'dim';
    return 'normal';
  }

  // --- drag & drop (bonus layer) --------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );
  function onDragStart(e: DragStartEvent) {
    setSel(null);
    setDragging(String(e.active.id));
  }
  function onDragCancel() {
    setDragging(null);
  }
  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const from = String(e.active.id); // "bench:<playerId>" | "slot:<slotId>"
    const to = e.over ? String(e.over.id) : null; // "slot:<slotId>" | "bench"
    if (!to) return;
    if (from.startsWith('bench:') && to.startsWith('slot:')) act.assignToSlot(to.slice(5), from.slice(6));
    else if (from.startsWith('slot:') && to.startsWith('slot:')) {
      if (from !== to) act.swapSlots(from.slice(5), to.slice(5));
    } else if (from.startsWith('slot:') && to === 'bench') act.clearSlot(from.slice(5));
  }
  const dragPlayer = dragging
    ? dragging.startsWith('bench:')
      ? playerById.get(dragging.slice(6))
      : playerById.get(draft.assignments[dragging.slice(5)] ?? '')
    : undefined;

  const hint =
    sel?.kind === 'bench'
      ? `${selPlayer?.name}: tapni na slot`
      : sel?.kind === 'slot'
        ? draft.assignments[sel.slotId]
          ? 'Tapni na jiného hráče (prohodit), prázdný slot (přesun) nebo lavičku'
          : 'Tapni na hráče na lavičce'
        : match
          ? `Sestava pro zápas · k dispozici ${match.availablePlayerIds.length} · šipkou zpět se uloží`
          : 'Tapni na hráče, pak na slot';

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
      <div className="flex h-full flex-col">
        {/* toolbar */}
        <div className="flex items-center gap-2 px-3 pt-2">
          <button
            type="button"
            onClick={() => setModal('formation')}
            className="tap rounded-xl border-2 border-ink/15 bg-white px-3 text-lg font-bold"
            aria-label="Změnit formaci"
          >
            {formation.name}
          </button>
          {match ? (
            <button
              type="button"
              onClick={() => {
                if (isDirty) act.saveDraft();
                act.leaveMatchEditing();
              }}
              className="tap flex min-w-0 flex-1 items-center justify-between rounded-xl border-2 border-accent bg-accent/10 px-3 text-left"
              aria-label="Zpět k zápasu"
            >
              <span className="truncate font-semibold">← vs {match.opponent}</span>
              <span className="ml-2 shrink-0 text-sm text-ink-muted">
                {filled}/8 {isDirty && '•'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setModal('lineups')}
              className="tap flex min-w-0 flex-1 items-center justify-between rounded-xl border-2 border-ink/15 bg-white px-3 text-left"
              aria-label="Uložené sestavy"
            >
              <span className="truncate font-semibold">{draft.name || 'Neuložená sestava'}</span>
              <span className="ml-2 shrink-0 text-sm text-ink-muted">
                {filled}/8 {isDirty && '•'}
              </span>
            </button>
          )}
          <Btn
            kind="primary"
            className="px-3"
            onClick={() => (draft.lineupId ? act.saveDraft() : setModal('saveAs'))}
            disabled={filled === 0 || (!!draft.lineupId && !isDirty)}
          >
            Uložit
          </Btn>
        </div>

        {/* pitch */}
        <div className="min-h-0 flex-[65] px-3 pt-2">
          <Pitch>
            {formation.slots.map((slot) => {
              const pid = draft.assignments[slot.id] ?? null;
              const found = pid ? (playerById.get(pid) ?? null) : null;
              const player = found && (!match || match.availablePlayerIds.includes(found.id)) && found.active ? found : null;
              return (
                <DraggableSlot
                  key={slot.id}
                  slot={slot}
                  player={player}
                  visual={slotVisual(slot, player)}
                  onTap={() => tapSlot(slot.id)}
                />
              );
            })}
          </Pitch>
        </div>

        {/* next step: a saved template can go straight into a new match */}
        {!match && draft.lineupId && !isDirty && filled === 8 && (
          <div className="px-3 pt-2">
            <Btn kind="primary" className="w-full py-2" onClick={() => setModal('newMatch')}>
              Připravit zápas s touto sestavou →
            </Btn>
          </div>
        )}

        {/* bench */}
        <BenchArea hint={hint}>
          {sel?.kind === 'slot' && draft.assignments[sel.slotId] && (
            <button
              type="button"
              onClick={() => {
                act.clearSlot(sel.slotId);
                setSel(null);
              }}
              className="tap flex h-[72px] w-[88px] shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-accent bg-accent/10 px-1 text-sm font-bold text-accent"
            >
              ↓ na lavičku
            </button>
          )}
          {bench.map((p) => (
            <DraggableTile key={p.id} player={p} sub={formatMinutes(season[p.id])} visual={tileVisual(p)} onTap={() => tapBench(p.id)} />
          ))}
          {bench.length === 0 && <p className="row-span-2 self-center px-2 text-ink-muted">Všichni dostupní hráči jsou na hřišti.</p>}
          {filled > 0 && (
            <button
              type="button"
              onClick={() => {
                act.clearDraft();
                setSel(null);
              }}
              className="tap flex h-[72px] w-[88px] shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-ink/20 px-1 text-sm font-semibold text-ink-muted"
            >
              Vyčistit
            </button>
          )}
        </BenchArea>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragPlayer && <BenchTile player={dragPlayer} visual="selected" />}
      </DragOverlay>

      {modal === 'formation' && (
        <FormationModal
          formations={formations}
          currentId={formation.id}
          onPick={(id) => {
            act.setDraftFormation(id);
            setSel(null);
          }}
          onAdd={act.addFormation}
          onDelete={act.deleteFormation}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'lineups' && (
        <LineupsModal
          lineups={lineups.filter((l) => !l.matchId)}
          formations={formations}
          currentId={draft.lineupId}
          onLoad={(id) => {
            act.loadLineup(id);
            setSel(null);
          }}
          onDuplicate={act.duplicateLineup}
          onDelete={act.deleteLineup}
          onRename={act.renameLineup}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'newMatch' && (
        <MatchForm
          title={`Nový zápas · ${draft.name}`}
          initial={{
            opponent: '',
            date: todayISO(),
            halfLengthMin: settings.defaultHalfLengthMin,
            halvesCount: settings.defaultHalvesCount,
            rotationIntervalMin: settings.defaultRotationIntervalMin,
            rotateGoalkeeper: false,
          }}
          onSave={(input) => {
            act.createMatch(input, draft.lineupId);
            setModal(null);
            act.setTab('match');
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'saveAs' && (
        <NamePrompt
          title="Uložit sestavu jako"
          placeholder="základ, bez Ondry, na silného soupeře…"
          onConfirm={(name) => {
            act.saveDraftAs(name);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </DndContext>
  );
}

function DraggableSlot({ slot, player, visual, onTap }: { slot: FormationSlot; player: Player | null; visual: SlotVisual; onTap: () => void }) {
  const { setNodeRef: setDrop, isOver } = useDroppable({ id: `slot:${slot.id}` });
  const { setNodeRef: setDrag, listeners, isDragging } = useDraggable({ id: `slot:${slot.id}`, disabled: !player });
  return (
    <SlotMarker
      slot={slot}
      player={player}
      visual={isOver ? 'target' : visual}
      onTap={onTap}
      nodeRef={(el) => {
        // dnd-kit types want HTMLElement but only uses getBoundingClientRect / listeners – SVG <g> is fine.
        setDrop(el as unknown as HTMLElement | null);
        setDrag(el as unknown as HTMLElement | null);
      }}
      listeners={listeners as Record<string, unknown>}
      style={isDragging ? { opacity: 0.35 } : undefined}
    />
  );
}

function DraggableTile({ player, sub, visual, onTap }: { player: Player; sub: string; visual: TileVisual; onTap: () => void }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `bench:${player.id}` });
  return (
    <BenchTile
      player={player}
      sub={sub}
      visual={visual}
      onTap={onTap}
      nodeRef={setNodeRef}
      listeners={listeners as Record<string, unknown>}
      attributes={attributes as unknown as Record<string, unknown>}
      style={isDragging ? { opacity: 0.35 } : undefined}
    />
  );
}

function BenchArea({ hint, children }: { hint: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'bench' });
  return (
    <div ref={setNodeRef} className={`no-touch-fx flex flex-[35] flex-col border-t-2 ${isOver ? 'border-accent bg-accent/5' : 'border-ink/10'}`}>
      <p className="px-3 pt-2 text-sm font-semibold text-ink-muted">{hint}</p>
      {/* two rows, scrolling horizontally: 8 tiles visible at once on a 375 px phone */}
      <div className="grid flex-1 grid-flow-col grid-rows-2 content-start gap-2 overflow-x-auto px-3 py-2" style={{ touchAction: 'pan-x' }}>
        {children}
      </div>
    </div>
  );
}
