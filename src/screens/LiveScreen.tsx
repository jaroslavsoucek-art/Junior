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
import { DetailHeader } from '../components/ScreenHeader';
import logo from '../assets/logo.png';
import { IconBack, IconPause, IconPencil, IconPlay, IconRotate } from '../components/icons';
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

  // A running match always wins over whatever was selected last.
  const match = live ?? matches.find((m) => m.id === activeMatchId);
  if (!match) {
    return (
      <div className="px-[18px] pt-5">
        <DetailHeader title="Live" subtitle="Žádný zápas není vybraný" onBack={() => setTab('match')} />
        <Btn kind="primary" className="mt-2 w-full" onClick={() => setTab('match')}>
          Přejít na zápasy
        </Btn>
      </div>
    );
  }
  if (match.status === 'planned') return <PreMatch match={match} />;
  if (match.status === 'finished') return <FinishedView match={match} />;
  return <LiveMatch match={match} />;
}

// ---------------------------------------------------------------------------

function PreMatch({ match }: { match: Match }) {
  const players = useStore((s) => s.players);
  const lineups = useStore((s) => s.lineups);
  const formations = useStore((s) => s.formations);
  const startMatch = useStore((s) => s.startMatch);
  const setTab = useStore((s) => s.setTab);
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const starting = startingLineup(match, lineups, formations, players);
  const ready = starting.filled === 8;
  const back = () => {
    openMatchDetail(match.id);
    setTab('match');
  };
  return (
    <div className="flex h-full flex-col px-[18px] pb-5 pt-5">
      <div className="mb-[18px] flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-line bg-surface">
          <img src={logo} alt="SK Junior Praha" className="size-8 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[24px] font-extrabold tracking-[-0.02em] text-heading">vs {match.opponent}</h1>
          <p className="mt-0.5 text-[13px] font-medium text-muted">
            {match.halvesCount}×{match.halfLengthMin} min · rotace {match.rotationIntervalMin} min · k dispozici {match.availablePlayerIds.length}
          </p>
        </div>
      </div>

      <div className="mb-3.5 rounded-[22px] border border-line bg-surface p-[18px]">
        <div className="mb-2.5 flex items-center justify-between gap-2.5">
          <span className="eyebrow">Startovní osmička</span>
          <span className={`tabular text-[15px] font-extrabold ${ready ? 'text-role-midc-text' : 'text-accent-text'}`}>{starting.filled} / 8</span>
        </div>
        <p className="text-[14px] font-semibold leading-[1.5] text-ink">
          {starting.formation ? `${starting.formation.name} · ` : ''}
          {starting.formation
            ? starting.formation.slots
                .map((sl) => starting.assignments[sl.id])
                .filter(Boolean)
                .map((id) => players.find((p) => p.id === id)?.name)
                .join(', ')
            : 'Sestava není vybraná.'}
        </p>
        {!ready && <p className="mt-2 text-[12px] font-bold text-accent-text">Doplň sestavu v přípravě zápasu.</p>}
      </div>

      <div className="mb-3.5 rounded-[22px] bg-primary p-[18px] text-white">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] opacity-80">Čas půle</span>
        <p className="tabular mt-1 text-[46px] font-black leading-none tracking-[-0.03em] opacity-55">00:00</p>
        <p className="mt-1.5 text-[12px] font-semibold opacity-80">Zahájení nasadí osmičku na hřiště. Hodiny spustíš až tlačítkem Start 1. půle.</p>
      </div>

      <button type="button" disabled={!ready} onClick={() => startMatch(match.id)} className="tap min-h-[68px] w-full rounded-[20px] bg-accent text-[19px] font-extrabold tracking-[-0.01em] text-white disabled:opacity-40" style={ready ? { boxShadow: '0 8px 24px rgba(164,23,42,0.28)' } : undefined}>
        Zahájit zápas
      </button>

      <button type="button" onClick={back} className="tap mt-auto min-h-[52px] w-full rounded-[18px] border border-line-2 bg-surface text-[14px] font-bold text-ink">
        ← Zpět na přípravu
      </button>
    </div>
  );
}

/** Finished match: summary card + load list inline (design „Live – dohráno“). */
function FinishedView({ match }: { match: Match }) {
  const players = useStore((s) => s.players);
  const setTab = useStore((s) => s.setTab);
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const [showAll, setShowAll] = useState(false);
  const last = match.events.reduce((a, e) => Math.max(a, e.at), 0);
  const seconds = computeMinutes(match, last);
  const total = Array.from({ length: match.halvesCount }, (_, i) => periodElapsedSec(match, i + 1, last)).reduce((a, b) => a + b, 0);
  const onPitchIds = new Set(Object.values(computeOnPitch(match.events)));
  const available = match.availablePlayerIds.filter((id) => players.some((p) => p.id === id));
  const { avg, rows } = computeLoad(available, seconds);
  const byId = new Map(players.map((p) => [p.id, p]));
  const visible = showAll ? rows : rows.slice(0, 8);
  const dev = (d: number) => {
    const m = Math.round(d / 60);
    return m === 0 ? '±0 min' : m > 0 ? `+${m} min` : `−${-m} min`;
  };
  return (
    <div className="h-full overflow-y-auto px-[18px] pb-5 pt-5">
      <div className="mb-3.5 rounded-[22px] border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <span className="eyebrow block truncate">Dohráno · vs {match.opponent}</span>
            <p className="tabular mt-1 text-[32px] font-black leading-none tracking-[-0.03em] text-heading">{formatClock(total)}</p>
          </div>
          <span className="shrink-0 rounded-full bg-role-midc/15 px-3 py-1.5 text-[11px] font-extrabold tracking-[0.06em] text-role-midc-text">V SEZÓNĚ</span>
        </div>
        <p className="mt-2.5 text-[12px] font-semibold text-muted">Minuty jsou zamčené a započítané do sezónního součtu na Kádru.</p>
      </div>

      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="eyebrow">Vytížení</h2>
        <span className="tabular text-[12px] font-bold text-muted">průměr {formatClock(avg)} · ● na hřišti na konci</span>
      </div>
      <ul className="flex flex-col gap-1">
        {visible.map((r) => (
          <li key={r.playerId} className={`flex min-h-11 items-center gap-2.5 rounded-[14px] border px-3.5 py-1 ${r.low ? 'border-accent-line bg-accent-soft' : 'border-line bg-surface'}`}>
            <span className={`size-2 shrink-0 rounded-full ${onPitchIds.has(r.playerId) ? 'bg-primary' : 'bg-ink/20'}`} aria-hidden />
            <span className={`min-w-0 flex-1 truncate text-[15px] font-bold ${r.low ? 'text-accent-text' : 'text-ink'}`}>{byId.get(r.playerId)?.name ?? r.playerId}</span>
            <span className={`tabular text-[15px] font-extrabold ${r.low ? 'text-accent-text' : 'text-ink'}`}>{formatClock(r.seconds)}</span>
            <span className={`tabular w-[62px] text-right text-[12px] font-bold ${r.low ? 'text-accent-text' : 'text-muted'}`}>{dev(r.deviation)}</span>
          </li>
        ))}
      </ul>
      {rows.length > 8 && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="tap mt-1.5 flex min-h-12 w-full items-center justify-center rounded-[14px] border border-dashed border-line-2 text-[13px] font-bold text-muted">
          {showAll ? 'Sbalit' : `Zobrazit všech ${rows.length}`}
        </button>
      )}
      <Btn
        className="mt-4 min-h-[52px] w-full rounded-[18px]"
        onClick={() => {
          openMatchDetail(match.id);
          setTab('match');
        }}
      >
        ← Detail zápasu
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
    state.kind === 'not_started' ? 'Před výkopem' : state.kind === 'running' ? `${state.period}. půle` : state.kind === 'stopped' ? `${state.period}. půle · stop` : 'Konec zápasu';
  const halfPct = Math.min(100, Math.round((elapsed / (match.halfLengthMin * 60)) * 100));
  const rotationLabel = anchor === null ? 'po startu' : due ? 'TEĎ' : formatClock(remaining);
  const planNames = planPairs.map((p) => name(p.onPlayerId)).join(', ');
  const back = () => {
    act.openMatchDetail(match.id);
    act.setTab('match');
  };

  return (
    <div className="no-touch-fx flex h-full flex-col">
      {/* hero: navy block with clock, half progress and period controls */}
      <div className="px-4 pt-[18px]">
        <div className={`flex items-center gap-3 rounded-[22px] px-4 py-3.5 text-white ${overtime && running ? 'bg-accent' : 'bg-primary'}`} style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <button type="button" onClick={back} className="tap -ml-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-white/80" aria-label="Zpět na zápas">
            <IconBack />
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-[7px]">
              <span className={`size-[7px] rounded-full ${running ? 'bg-gold' : 'bg-white/40'}`} />
              <span className="truncate text-[11px] font-extrabold uppercase tracking-[0.1em] opacity-85">
                {periodLabel} · vs {match.opponent}
              </span>
            </div>
            <p className="tabular text-[46px] font-black leading-none tracking-[-0.03em]" style={{ color: 'var(--clock-fg)' }}>{formatClock(elapsed)}</p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/20">
              <span className="block h-full rounded-full bg-gold" style={{ width: `${halfPct}%` }} />
            </div>
          </div>
          {!finished && (
            <div className="flex shrink-0 flex-col gap-2">
              {state.kind === 'not_started' && (
                <button type="button" onClick={() => act.startPeriod(match.id, 1)} className="tap flex min-h-[52px] items-center gap-2 rounded-2xl bg-white px-3.5 text-[13px] font-extrabold text-[#161c4b]">
                  <IconPlay size={16} /> Start 1. půle
                </button>
              )}
              {state.kind === 'running' && (
                <>
                  <button type="button" onClick={() => { act.endPeriod(match.id); showToast('Čas zastaven'); }} className="tap flex size-[52px] items-center justify-center self-end rounded-2xl border border-white/25 bg-white/10 text-white" aria-label="Pauza">
                    <IconPause />
                  </button>
                  <button type="button" onClick={() => { act.endPeriod(match.id); showToast(`Konec ${state.period}. půle`); }} className="tap min-h-[52px] rounded-2xl bg-white px-3 text-[12px] font-extrabold text-[#161c4b]">
                    Konec půle
                  </button>
                </>
              )}
              {state.kind === 'stopped' && (
                <>
                  <button type="button" onClick={() => act.startPeriod(match.id, state.period)} className="tap flex min-h-[52px] items-center justify-center gap-1.5 rounded-2xl border border-white/25 bg-white/10 px-3 text-[12px] font-extrabold text-white">
                    <IconPlay size={14} /> Dál
                  </button>
                  {state.period < match.halvesCount ? (
                    <button type="button" onClick={() => act.startPeriod(match.id, state.period + 1)} className="tap min-h-[52px] rounded-2xl bg-white px-3 text-[12px] font-extrabold text-[#161c4b]">
                      {state.period + 1}. půle
                    </button>
                  ) : (
                    <button type="button" onClick={() => setConfirmFinish(true)} className="tap min-h-[52px] rounded-2xl bg-gold px-3 text-[12px] font-extrabold text-[#141728]">
                      Konec zápasu
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* rotation CTA */}
      {!finished && (
        <div className="flex gap-2 px-4 pt-2.5">
          <button
            type="button"
            disabled={planPairs.length === 0 || state.kind === 'not_started'}
            onClick={() => executeRotation(planPairs)}
            className="tap flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-[20px] bg-accent px-4 text-white disabled:opacity-40"
            style={due ? { boxShadow: '0 6px 18px rgba(164,23,42,0.28)' } : undefined}
          >
            <IconRotate />
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[17px] font-extrabold tracking-[-0.01em]">Provést rotaci</span>
              <span className="block truncate text-[11px] font-bold opacity-85">
                {planPairs.length === 0 ? 'nikdo na lavičce' : `${planPairs.length} ${planPairs.length === 1 ? 'dvojice' : planPairs.length < 5 ? 'dvojice' : 'dvojic'} · ${planNames}`}
              </span>
            </span>
            <span className={`tabular shrink-0 rounded-full px-2.5 py-[5px] text-[12px] font-extrabold tracking-[0.06em] ${due ? 'bg-white text-accent' : 'bg-white/18'}`}>{rotationLabel}</span>
          </button>
          <button type="button" disabled={!rotationInput || bench.length === 0} onClick={() => setRotationOpen(true)} className="tap flex min-h-16 w-14 items-center justify-center rounded-[20px] border border-line-2 bg-surface text-heading disabled:opacity-40" aria-label="Upravit rotaci">
            <IconPencil />
          </button>
        </div>
      )}
      {!wakeLockSupported && !finished && !settings.wakeLockNoticeShown && (
        <button type="button" onClick={() => act.updateSettings({ wakeLockNoticeShown: true })} className="tap w-full px-5 pt-1 text-left text-[11px] font-semibold text-faint">
          Displej může zhasnout, čas běží dál. Tapem skrýt.
        </button>
      )}

      {/* pitch – dominant */}
      <div className="min-h-0 flex-1 px-4 pt-2.5">
        <div className="h-full overflow-hidden rounded-[22px] bg-pitch shadow-card">
          {formation && (
            <Pitch>
              {formation.slots.map((slot) => {
                const pid = pitch[slot.id] ?? null;
                const player = pid ? (playerById.get(pid) ?? null) : null;
                return <SlotMarker key={slot.id} slot={slot} player={player} visual={slotVisual(slot.id, slot.role)} extraLabel={pid ? `${Math.floor((seconds[pid] ?? 0) / 60)}′` : undefined} onTap={() => tapSlot(slot.id)} />;
              })}
            </Pitch>
          )}
        </div>
      </div>

      {/* bench */}
      <div className="px-4 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="eyebrow truncate">
            {finished
              ? 'Zápas uzavřen'
              : sel?.kind === 'slot'
                ? `${name(pitch[sel.slotId]) || 'Prázdný slot'} · tapni, kdo jde na hřiště`
                : sel?.kind === 'bench'
                  ? `${selPlayer?.name} · tapni, koho střídá`
                  : `Lavička ${bench.length}`}
          </p>
          {!sel && !finished && <p className="shrink-0 text-[11px] font-semibold text-faint">nejmíň hraje vlevo</p>}
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" style={{ touchAction: 'pan-x' }}>
          {sel?.kind === 'slot' && pitch[sel.slotId] && (
            <button type="button" onClick={takeOff} className="tap flex min-h-[74px] w-[90px] shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent-line bg-accent-soft px-1 text-[13px] font-extrabold text-accent-text">
              ▼ jen dolů
            </button>
          )}
          {bench.map((p) => (
            <BenchTile key={p.id} player={p} sub={formatClock(seconds[p.id] ?? 0)} visual={tileVisual(p)} onTap={() => tapBench(p.id)} width={90} />
          ))}
          {bench.length === 0 && <p className="self-center px-2 text-[13px] text-muted">Lavička je prázdná.</p>}
        </div>
      </div>

      {/* bottom row */}
      <div className="flex gap-2 px-4 pb-[18px] pt-3">
        <button type="button" onClick={() => setLoadOpen(true)} className="tap flex min-h-[52px] flex-1 items-center justify-between rounded-2xl border border-line bg-surface px-3.5 text-left">
          <span className="text-[14px] font-bold text-ink">Vytížení</span>
          <span className="tabular text-[13px] font-bold text-muted">ø {formatClock(load.avg)}</span>
        </button>
        {!finished && state.kind !== 'not_started' && (
          <button type="button" onClick={() => setConfirmFinish(true)} className="tap min-h-[52px] rounded-2xl border border-accent-line bg-accent-soft px-4 text-[14px] font-bold text-accent-text">
            Konec zápasu
          </button>
        )}
        {finished && (
          <button type="button" onClick={back} className="tap min-h-[52px] rounded-2xl border border-line-2 bg-surface px-4 text-[14px] font-bold text-ink">
            Detail zápasu
          </button>
        )}
      </div>
      {loadOpen && <LoadPanel availableIds={available} seconds={seconds} players={players} onPitchIds={onPitchIds} open onToggle={() => setLoadOpen(false)} />}

      {toast && (
        <div className="fixed inset-x-4 bottom-[92px] z-40 flex items-center justify-between gap-3 rounded-[18px] bg-[#141728] px-4 py-3 text-white shadow-float">
          <span className="min-w-0 truncate font-semibold">{toast.text}</span>
          {toast.undoable && (
            <button type="button" onClick={undo} className="tap shrink-0 rounded-xl bg-gold px-4 text-[14px] font-extrabold text-[#141728]">
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
