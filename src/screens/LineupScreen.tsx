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
import { LineupsListScreen } from './LineupsListScreen';
import { NamePrompt } from '../components/NamePrompt';
import { MatchForm } from '../components/MatchForm';
import { todayISO } from '../lib/match';
import { Btn } from '../components/Modal';
import { IconArrowRight, IconBack, IconChevronDown } from '../components/icons';
import { orderBench, roleFit } from '../lib/lineup';
import { appearances, formatAppearances } from '../lib/season';
import type { FormationSlot, Player } from '../types';

type Sel = { kind: 'bench'; playerId: string } | { kind: 'slot'; slotId: string } | null;

export function LineupScreen() {
  const view = useStore((s) => s.lineupView);
  if (view === 'list') return <LineupsListScreen />;
  return <LineupEditor />;
}

function LineupEditor() {
  const players = useStore((s) => s.players);
  const formations = useStore((s) => s.formations);
  const lineups = useStore((s) => s.lineups);
  const matches = useStore((s) => s.matches);
  const draft = useStore((s) => s.draft);
  const act = useStore();

  const [sel, setSel] = useState<Sel>(null);
  const [modal, setModal] = useState<'formation' | 'saveAs' | 'newMatch' | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const formation = formations.find((f) => f.id === draft.formationId) ?? formations[0];
  const season = useMemo(() => appearances(matches), [matches]);
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

  const selLabel =
    sel?.kind === 'bench'
      ? { pill: `${selPlayer?.name} vybrán`, text: 'tapni slot, kam ho posadit' }
      : sel?.kind === 'slot'
        ? draft.assignments[sel.slotId]
          ? { pill: `${playerById.get(draft.assignments[sel.slotId]!)?.name ?? ''} vybrán`, text: 'tapni hráče (prohodit), slot (přesun) nebo ↓' }
          : { pill: 'Prázdný slot', text: 'tapni hráče na lavičce' }
        : null;
  const benchLabel = match ? `Lavička · k dispozici ${match.availablePlayerIds.length}` : `Lavička ${bench.length}`;
  const canPrepareMatch = !match && draft.lineupId && !isDirty && filled === 8;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
      <div className="flex h-full flex-col">
        {/* toolbar */}
        <div className="flex items-center gap-2 px-4 pb-3 pt-[18px]">
          <button type="button" onClick={() => setModal('formation')} className="tap flex min-h-[46px] items-center gap-2 rounded-[14px] border border-line-2 bg-surface px-3.5" aria-label="Změnit formaci">
            <span className="text-[15px] font-extrabold tracking-[0.02em] text-heading">{formation.name}</span>
            <IconChevronDown className="text-faint" size={14} />
          </button>
          {match ? (
            <button
              type="button"
              onClick={() => {
                if (isDirty) act.saveDraft();
                act.leaveMatchEditing();
              }}
              className="tap flex min-h-[46px] min-w-0 flex-1 items-center justify-between gap-2 rounded-[14px] border border-accent-line bg-accent-soft px-3 text-left"
              aria-label="Zpět k zápasu"
            >
              <span className="flex min-w-0 items-center gap-2">
                <IconBack size={16} className="shrink-0 text-accent-text" />
                <span className="truncate text-[14px] font-bold text-accent-text">vs {match.opponent}</span>
              </span>
              <span className="tabular flex shrink-0 items-center gap-1.5 text-[12px] font-extrabold text-accent-text">
                {filled}/8 {isDirty && <span className="size-1.5 rounded-full bg-gold" />}
              </span>
            </button>
          ) : (
            <button type="button" onClick={() => act.setLineupView('list')} className="tap flex min-h-[46px] min-w-0 flex-1 items-center justify-between gap-2 rounded-[14px] border border-line-2 bg-surface px-3 text-left" aria-label="Zpět na seznam sestav">
              <span className="flex min-w-0 items-center gap-2">
                <IconBack size={16} className="shrink-0 text-heading" />
                <span className="truncate text-[14px] font-bold text-ink">{draft.name || 'Neuložená sestava'}</span>
              </span>
              <span className="tabular flex shrink-0 items-center gap-1.5 text-[12px] font-extrabold text-heading">
                {filled}/8 {isDirty && <span className="size-1.5 rounded-full bg-gold" />}
              </span>
            </button>
          )}
          <Btn kind="primary" className="min-h-[46px] rounded-[14px] px-4 py-0" onClick={() => (draft.lineupId ? act.saveDraft() : setModal('saveAs'))} disabled={filled === 0 || (!!draft.lineupId && !isDirty)}>
            Uložit
          </Btn>
        </div>

        {canPrepareMatch && (
          <div className="px-4 pb-3">
            <Btn kind="soft" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] py-0" onClick={() => setModal('newMatch')}>
              Připravit zápas s touto sestavou <IconArrowRight size={16} />
            </Btn>
          </div>
        )}

        {/* pitch */}
        <div className="min-h-0 flex-1 px-4">
          <div className="no-touch-fx h-full overflow-hidden rounded-[22px] bg-pitch shadow-card">
            <Pitch>
              {formation.slots.map((slot) => {
                const pid = draft.assignments[slot.id] ?? null;
                const found = pid ? (playerById.get(pid) ?? null) : null;
                const player = found && (!match || match.availablePlayerIds.includes(found.id)) && found.active ? found : null;
                return <DraggableSlot key={slot.id} slot={slot} player={player} visual={slotVisual(slot, player)} onTap={() => tapSlot(slot.id)} />;
              })}
            </Pitch>
          </div>
        </div>

        {/* bench */}
        <BenchArea>
          <div className="mb-2.5 flex min-h-7 items-center gap-2">
            {selLabel ? (
              <>
                <span className="flex items-center gap-1.5 rounded-full bg-gold-soft px-2.5 py-[5px]">
                  <span className="size-[7px] rounded-full bg-gold" />
                  <span className="text-[12px] font-extrabold text-gold-text">{selLabel.pill}</span>
                </span>
                <span className="truncate text-[12px] font-semibold text-muted">{selLabel.text}</span>
              </>
            ) : (
              <>
                <span className="eyebrow">{benchLabel}</span>
                <span className="ml-auto text-[11px] font-semibold text-faint">tap hráč → tap slot</span>
              </>
            )}
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" style={{ touchAction: 'pan-x' }}>
            {sel?.kind === 'slot' && draft.assignments[sel.slotId] && (
              <button
                type="button"
                onClick={() => {
                  act.clearSlot(sel.slotId);
                  setSel(null);
                }}
                className="tap flex min-h-[76px] w-[92px] shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent-line bg-accent-soft px-1 text-[13px] font-extrabold text-accent-text"
              >
                ↓ na lavičku
              </button>
            )}
            {bench.map((p) => (
              <DraggableTile key={p.id} player={p} sub={formatAppearances(season[p.id])} visual={tileVisual(p)} onTap={() => tapBench(p.id)} />
            ))}
            {bench.length === 0 && <p className="self-center px-2 text-[13px] text-muted">Všichni dostupní hráči jsou na hřišti.</p>}
            {filled > 0 && (
              <button
                type="button"
                onClick={() => {
                  act.clearDraft();
                  setSel(null);
                }}
                className="tap flex min-h-[76px] w-[92px] shrink-0 items-center justify-center rounded-2xl border border-dashed border-line-2 px-1 text-[13px] font-bold text-muted"
              >
                Vyčistit
              </button>
            )}
          </div>
        </BenchArea>
      </div>

      <DragOverlay dropAnimation={null}>{dragPlayer && <BenchTile player={dragPlayer} visual="selected" />}</DragOverlay>

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
      {modal === 'newMatch' && (
        <MatchForm
          title={`Nový zápas · ${draft.name}`}
          submitLabel="Vytvořit zápas"
          initial={{ opponent: '', date: todayISO(), rotateGoalkeeper: false }}
          onSave={(input) => {
            act.createMatch(input, draft.lineupId);
            setModal(null);
            act.setLineupView('list');
            act.setTab('match');
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'saveAs' && (
        <NamePrompt
          title="Uložit sestavu jako"
          subtitle="Například základ, bez Ondry, na silného soupeře"
          placeholder="základ"
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

function BenchArea({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'bench' });
  return (
    <div ref={setNodeRef} className={`no-touch-fx px-4 pb-[18px] pt-3 ${isOver ? 'bg-accent-soft' : ''}`}>
      {children}
    </div>
  );
}
