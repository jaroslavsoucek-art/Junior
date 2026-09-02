import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { Pitch } from '../components/Pitch';
import { SlotMarker, type SlotVisual } from '../components/SlotMarker';
import { BenchTile, type TileVisual } from '../components/BenchTile';
import { Btn, Confirm } from '../components/Modal';
import { RotationSheet } from '../components/RotationSheet';
import { LoadPanel } from '../components/LoadPanel';
import { useNow } from '../hooks/useNow';
import { useWakeLock } from '../hooks/useWakeLock';
import { clockState, computeMinutes, formatClock, onPitch as computeOnPitch, periodElapsedSec } from '../lib/minutes';
import { computeLoad, playSecondsSince, proposeFromPlan, rotationAnchor, sanitizeGroups, type RotationInput, type RotationPair } from '../lib/rotation';
import { ScreenHeader } from '../components/ScreenHeader';
import { startingLineup } from '../lib/match';
import { roleFit } from '../lib/lineup';
import type { Formation, Match, Player } from '../types';

export function LiveScreen() {
  const matches = useStore((s) => s.matches);
  const activeMatchId = useStore((s) => s.activeMatchId);
  const setActiveMatch = useStore((s) => s.setActiveMatch);
  const setTab = useStore((s) => s.setTab);

  // If nothing is selected but a match is live, jump to it (e.g. after the app was killed).
  const live = matches.find((m) => m.status === 'live');
  useEffect(() => {
    if (!activeMatchId && live) setActiveMatch(live.id);
  }, [activeMatchId, live, setActiveMatch]);

  const match = matches.find((m) => m.id === activeMatchId);
  if (!match) {
    return (
      <div className="px-4">
        <ScreenHeader title="Live" subtitle="Průběh zápasu" />
        <p className="text-ink-muted">Žádný zápas není vybraný.</p>
        <Btn className="mt-4 w-full" onClick={() => setTab('match')}>
          Přejít na Zápas
        </Btn>
      </div>
    );
  }
  if (match.status === 'planned') return <PreMatch match={match} />;
  return <LiveMatch match={match} />;
}

// ---------------------------------------------------------------------------

function PreMatch({ match }: { match: Match }) {
  const players = useStore((s) => s.players);
  const lineups = useStore((s) => s.lineups);
  const formations = useStore((s) => s.formations);
  const startMatch = useStore((s) => s.startMatch);
  const setTab = useStore((s) => s.setTab);
  const starting = startingLineup(match, lineups, formations, players);
  const ready = starting.filled === 8;
  return (
    <div className="flex h-full flex-col px-4 pb-4">
      <ScreenHeader
        title={`vs ${match.opponent}`}
        subtitle={`${match.halvesCount}×${match.halfLengthMin} min · rotace každých ${match.rotationIntervalMin} min · k dispozici ${match.availablePlayerIds.length}`}
      />
      <div className="my-4 rounded-2xl border border-ink/10 bg-white p-4">
        <p className={`text-lg font-bold ${ready ? 'text-primary' : 'text-accent'}`}>Startovní osmička: {starting.filled} / 8</p>
        {!ready && <p className="mt-1 text-sm text-ink-muted">Doplň sestavu v tabu Zápas.</p>}
        {starting.formation && (
          <p className="mt-1 text-sm text-ink-muted">
            {starting.formation.name} ·{' '}
            {starting.formation.slots
              .map((s) => starting.assignments[s.id])
              .filter(Boolean)
              .map((id) => players.find((p) => p.id === id)?.name)
              .join(', ')}
          </p>
        )}
      </div>
      <Btn kind="primary" className="w-full py-5 text-xl" disabled={!ready} onClick={() => startMatch(match.id)}>
        Zahájit zápas
      </Btn>
      <p className="mt-2 text-center text-sm text-ink-muted">Nasadí osmičku na hřiště. Čas půle spustíš až pak tlačítkem Start.</p>
      <Btn kind="ghost" className="mt-auto" onClick={() => setTab('match')}>
        ← Zpět na přípravu
      </Btn>
    </div>
  );
}

// ---------------------------------------------------------------------------

type Sel = { kind: 'slot'; slotId: string } | { kind: 'bench'; playerId: string } | null;
type Toast = { text: string; undoable: boolean; id: number };

function LiveMatch({ match }: { match: Match }) {
  const players = useStore((s) => s.players);
  const lineups = useStore((s) => s.lineups);
  const formations = useStore((s) => s.formations);
  const settings = useStore((s) => s.settings);
  const act = useStore();

  const state = clockState(match);
  const running = state.kind === 'running';
  const finished = match.status === 'finished';
  const now = useNow(running && !finished);
  const { supported: wakeLockSupported } = useWakeLock(!finished);

  const [sel, setSel] = useState<Sel>(null);
  const [rotationOpen, setRotationOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(finished);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const toastSeq = useRef(0);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const formation: Formation | undefined = useMemo(() => {
    const l = match.startingLineupId ? lineups.find((x) => x.id === match.startingLineupId) : undefined;
    return (l && formations.find((f) => f.id === l.formationId)) ?? formations[0];
  }, [match.startingLineupId, lineups, formations]);

  const seconds = useMemo(() => computeMinutes(match, now), [match, now]);
  const pitch = useMemo(() => computeOnPitch(match.events), [match.events]);
  const onPitchIds = useMemo(() => new Set(Object.values(pitch)), [pitch]);
  const available = useMemo(() => match.availablePlayerIds.filter((id) => playerById.has(id)), [match.availablePlayerIds, playerById]);
  const bench = useMemo(
    () =>
      available
        .filter((id) => !onPitchIds.has(id))
        .map((id) => playerById.get(id)!)
        .sort((a, b) => (seconds[a.id] ?? 0) - (seconds[b.id] ?? 0) || a.name.localeCompare(b.name, 'cs')),
    [available, onPitchIds, playerById, seconds],
  );
  const load = useMemo(() => computeLoad(available, seconds), [available, seconds]);
  const lowIds = useMemo(() => new Set(load.rows.filter((r) => r.low).map((r) => r.playerId)), [load]);

  // period / clock
  const period = state.kind === 'running' || state.kind === 'stopped' ? state.period : state.kind === 'not_started' ? 0 : match.halvesCount;
  const elapsed = period > 0 ? periodElapsedSec(match, period, now) : 0;
  const overtime = elapsed > match.halfLengthMin * 60;

  // rotation countdown (match clock since last sub / period start)
  const anchor = rotationAnchor(match.events);
  const sinceSub = anchor === null ? 0 : playSecondsSince(match.events, anchor, now);
  const remaining = match.rotationIntervalMin * 60 - sinceSub;
  const due = anchor !== null && remaining <= 0 && !finished;
  const dueRef = useRef(false);
  useEffect(() => {
    if (due && !dueRef.current) navigator.vibrate?.([200, 100, 200]);
    dueRef.current = due;
  }, [due]);

  function showToast(text: string, undoable = true) {
    setToast({ text, undoable, id: ++toastSeq.current });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  }
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const name = (id: string | null | undefined) => (id ? (playerById.get(id)?.name ?? id) : '');

  // --- substitutions by two taps -------------------------------------------
  function doSub(slotId: string, onPlayerId: string) {
    const off = pitch[slotId];
    if (off === onPlayerId) return;
    if (off) {
      act.substitute(match.id, [{ onPlayerId, offPlayerId: off, slotId }]);
      showToast(`${name(onPlayerId)} ▲  ${name(off)} ▼`);
    } else {
      act.playerOn(match.id, onPlayerId, slotId);
      showToast(`${name(onPlayerId)} ▲ na hřiště`);
    }
    setSel(null);
  }
  function tapSlot(slotId: string) {
    if (finished) return;
    if (sel?.kind === 'bench') return doSub(slotId, sel.playerId);
    setSel(sel?.kind === 'slot' && sel.slotId === slotId ? null : { kind: 'slot', slotId });
  }
  function tapBench(playerId: string) {
    if (finished) return;
    if (sel?.kind === 'slot') return doSub(sel.slotId, playerId);
    setSel(sel?.kind === 'bench' && sel.playerId === playerId ? null : { kind: 'bench', playerId });
  }
  function takeOff() {
    if (sel?.kind !== 'slot') return;
    const pid = pitch[sel.slotId];
    if (!pid) return;
    act.playerOff(match.id, pid);
    showToast(`${name(pid)} ▼ dolů bez náhrady`);
    setSel(null);
  }
  function undo() {
    act.undoLastEvent(match.id);
    setToast(null);
    setSel(null);
  }

  const selSlotRole = sel?.kind === 'slot' ? formation?.slots.find((s) => s.id === sel.slotId)?.role : undefined;
  const selPlayer = sel?.kind === 'bench' ? playerById.get(sel.playerId) : undefined;
  function slotVisual(slotId: string, role: Player['roles'][number]): SlotVisual {
    if (sel?.kind === 'slot') return sel.slotId === slotId ? 'selected' : 'normal';
    if (selPlayer) return roleFit(selPlayer, role) > 0 ? 'target' : 'dim';
    return 'normal';
  }
  function tileVisual(p: Player): TileVisual {
    if (sel?.kind === 'bench') return sel.playerId === p.id ? 'selected' : 'normal';
    if (selSlotRole) return roleFit(p, selSlotRole) === 2 ? 'fit' : roleFit(p, selSlotRole) === 1 ? 'normal' : 'dim';
    return lowIds.has(p.id) ? 'low' : 'normal';
  }

  const rotationInput: RotationInput | null = formation
    ? { formation, onPitch: pitch, benchIds: bench.map((b) => b.id), players, seconds, rotateGoalkeeper: match.rotateGoalkeeper }
    : null;
  // Planned pairs (from the prep plan, kept in sync after every substitution) – one tap executes them.
  const planPairs: RotationPair[] =
    rotationInput && formation ? proposeFromPlan(rotationInput, sanitizeGroups(match.rotationGroups ?? {}, formation, available)) : [];

  function executeRotation(pairs: RotationPair[]) {
    act.substitute(match.id, pairs);
    setRotationOpen(false);
    showToast(`Rotace: ${pairs.map((p) => `${name(p.onPlayerId)}▲${name(p.offPlayerId)}▼`).join('  ')}`);
  }

  const periodLabel =
    state.kind === 'not_started'
      ? 'Před výkopem'
      : state.kind === 'running'
        ? `${state.period}. půle`
        : state.kind === 'stopped'
          ? `${state.period}. půle · zastaveno`
          : 'Konec zápasu';

  return (
    <div className="flex h-full flex-col no-touch-fx">
      {/* clock + controls */}
      <div className={`px-3 pt-2 ${overtime && running ? 'bg-accent/10' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-muted">
              vs {match.opponent} · {periodLabel}
            </p>
            <p className={`text-5xl font-black tabular-nums leading-none ${overtime ? 'text-accent' : ''}`} aria-live="off">
              {formatClock(elapsed)}
              <span className="ml-2 text-base font-semibold text-ink-muted">/ {match.halfLengthMin}:00</span>
            </p>
          </div>
          {!finished && (
            <div className="flex flex-col gap-1">
              {state.kind === 'not_started' && (
                <Btn kind="primary" className="px-5 py-3" onClick={() => act.startPeriod(match.id, 1)}>
                  ▶ Start 1. půle
                </Btn>
              )}
              {state.kind === 'running' && (
                <>
                  <Btn className="px-4 py-2" onClick={() => { act.endPeriod(match.id); showToast('Čas zastaven'); }}>
                    ⏸ Pauza
                  </Btn>
                  <Btn kind="danger" className="px-4 py-2" onClick={() => { act.endPeriod(match.id); showToast(`Konec ${state.period}. půle`); }}>
                    Konec {state.period}. půle
                  </Btn>
                </>
              )}
              {state.kind === 'stopped' && (
                <>
                  <Btn className="px-4 py-2" onClick={() => act.startPeriod(match.id, state.period)}>
                    ▶ Pokračovat
                  </Btn>
                  {state.period < match.halvesCount ? (
                    <Btn kind="primary" className="px-4 py-2" onClick={() => act.startPeriod(match.id, state.period + 1)}>
                      ▶ Start {state.period + 1}. půle
                    </Btn>
                  ) : (
                    <Btn kind="danger" className="px-4 py-2" onClick={() => setConfirmFinish(true)}>
                      Konec zápasu
                    </Btn>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* rotation bar: countdown + one-button execution of the planned pairs */}
        {!finished && (
          <div className={`mt-2 rounded-xl border-2 p-2 ${due ? 'border-accent bg-accent/10' : 'border-ink/15 bg-white'}`}>
            <div className="flex items-center justify-between px-1">
              <span className={`font-bold ${due ? 'text-accent' : ''}`}>
                {due ? 'Střídat! Rotace je na řadě' : anchor === null ? 'Rotace po startu' : `Střídání za ${formatClock(remaining)}`}
              </span>
              <span className="text-xs font-semibold text-ink-muted">každých {match.rotationIntervalMin} min</span>
            </div>
            {planPairs.length > 0 && (
              <p className="truncate px-1 text-xs text-ink-muted">
                {planPairs.map((p) => `${name(p.onPlayerId)} ↔ ${name(p.offPlayerId)}`).join(' · ')}
              </p>
            )}
            <div className="mt-1 flex gap-2">
              <Btn kind={due ? 'danger' : 'primary'} className="flex-1 py-2" disabled={planPairs.length === 0 || state.kind === 'not_started'} onClick={() => executeRotation(planPairs)}>
                Provést rotaci ({planPairs.length})
              </Btn>
              <Btn className="px-3 py-2" disabled={!rotationInput || bench.length === 0} onClick={() => setRotationOpen(true)}>
                Upravit
              </Btn>
            </div>
          </div>
        )}
        {!wakeLockSupported && !finished && !settings.wakeLockNoticeShown && (
          <button
            type="button"
            onClick={() => act.updateSettings({ wakeLockNoticeShown: true })}
            className="tap mt-1 w-full rounded-lg px-2 text-left text-xs text-ink-muted"
          >
            Displej může zhasnout, čas běží dál i se zhasnutým displejem. Tapem skrýt.
          </button>
        )}
      </div>

      {/* pitch */}
      <div className="min-h-0 flex-1 px-3 pt-2">
        {formation && (
          <Pitch>
            {formation.slots.map((slot) => {
              const pid = pitch[slot.id] ?? null;
              const player = pid ? (playerById.get(pid) ?? null) : null;
              return (
                <SlotMarker
                  key={slot.id}
                  slot={slot}
                  player={player}
                  visual={slotVisual(slot.id, slot.role)}
                  extraLabel={pid ? formatClock(seconds[pid] ?? 0) : undefined}
                  onTap={() => tapSlot(slot.id)}
                />
              );
            })}
          </Pitch>
        )}
      </div>

      {/* bench */}
      <div className="border-t-2 border-ink/10">
        <p className="px-3 pt-1 text-sm font-semibold text-ink-muted">
          {finished
            ? 'Zápas uzavřen – minuty jsou v sezónním součtu.'
            : sel?.kind === 'slot'
              ? `${name(pitch[sel.slotId]) || 'Prázdný slot'}: tapni, kdo jde na hřiště`
              : sel?.kind === 'bench'
                ? `${selPlayer?.name}: tapni, koho střídá`
                : `Lavička ${bench.length} · nejmíň hraje vlevo`}
        </p>
        <div className="grid grid-flow-col grid-rows-2 content-start gap-2 overflow-x-auto px-3 py-2" style={{ touchAction: 'pan-x' }}>
          {sel?.kind === 'slot' && pitch[sel.slotId] && (
            <button
              type="button"
              onClick={takeOff}
              className="tap flex h-[72px] w-[88px] shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-accent bg-accent/10 px-1 text-sm font-bold text-accent"
            >
              ▼ jen dolů
            </button>
          )}
          {bench.map((p) => (
            <BenchTile key={p.id} player={p} sub={formatClock(seconds[p.id] ?? 0)} visual={tileVisual(p)} onTap={() => tapBench(p.id)} />
          ))}
          {bench.length === 0 && <p className="row-span-2 self-center px-2 text-ink-muted">Lavička je prázdná.</p>}
        </div>
      </div>

      <LoadPanel availableIds={available} seconds={seconds} players={players} onPitchIds={onPitchIds} open={loadOpen} onToggle={() => setLoadOpen((v) => !v)} />

      {!finished && state.kind !== 'not_started' && state.kind !== 'stopped' && (
        <div className="border-t border-ink/10 bg-white px-3 py-2">
          <Btn kind="ghost" className="w-full text-accent" onClick={() => setConfirmFinish(true)}>
            Konec zápasu
          </Btn>
        </div>
      )}
      {state.kind === 'not_started' && (
        <div className="border-t border-ink/10 bg-white px-3 py-2">
          <Btn kind="ghost" className="w-full text-ink-muted" onClick={() => act.setTab('match')}>
            ← Příprava zápasu
          </Btn>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-3 bottom-24 z-40 flex items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-white shadow-lg">
          <span className="min-w-0 truncate font-semibold">{toast.text}</span>
          {toast.undoable && (
            <button type="button" onClick={undo} className="tap shrink-0 rounded-lg bg-white px-4 font-bold text-ink">
              Vzít zpět
            </button>
          )}
        </div>
      )}

      {rotationOpen && rotationInput && (
        <RotationSheet input={rotationInput} initialPairs={planPairs} onConfirm={executeRotation} onClose={() => setRotationOpen(false)} />
      )}
      {confirmFinish && (
        <Confirm
          title="Ukončit zápas?"
          text="Čas se zastaví a minuty se zamknou do sezónního součtu. Střídání ani čas už nepůjde měnit."
          confirmLabel="Ukončit"
          danger
          onCancel={() => setConfirmFinish(false)}
          onConfirm={() => {
            act.finishMatch(match.id);
            setConfirmFinish(false);
            setLoadOpen(true);
          }}
        />
      )}
    </div>
  );
}
