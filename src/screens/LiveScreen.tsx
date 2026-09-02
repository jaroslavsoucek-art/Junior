import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { Pitch } from '../components/Pitch';
import { SlotMarker, type SlotVisual } from '../components/SlotMarker';
import { BenchTile, type TileVisual } from '../components/BenchTile';
import { Btn, Confirm } from '../components/Modal';
import { RotationSheet } from '../components/RotationSheet';
import { DetailHeader } from '../components/ScreenHeader';
import { IconBack, IconPencil, IconRotate } from '../components/icons';
import logo from '../assets/logo.png';
import { appeared, lastOffOrder, onPitch as computeOnPitch } from '../lib/minutes';
import { proposeFromPlan, sanitizeGroups, type RotationInput, type RotationPair } from '../lib/rotation';
import { startingLineup } from '../lib/match';
import { roleFit } from '../lib/lineup';
import { ROLE_SHORT, type Formation, type Match, type Player } from '../types';

/**
 * Zápas (dřív „Live“): kdo je na hřišti, střídání dvěma tapy, rotace jedním
 * tlačítkem. Appka neměří čas – žádné hodiny, minuty ani odpočet.
 */
export function LiveScreen() {
  const matches = useStore((s) => s.matches);
  const activeMatchId = useStore((s) => s.activeMatchId);
  const setActiveMatch = useStore((s) => s.setActiveMatch);
  const setTab = useStore((s) => s.setTab);

  const live = matches.find((m) => m.status === 'live');
  useEffect(() => {
    if (!activeMatchId && live) setActiveMatch(live.id);
  }, [activeMatchId, live, setActiveMatch]);

  const match = live ?? matches.find((m) => m.id === activeMatchId);
  if (!match) {
    return (
      <div className="px-[18px] pt-5">
        <DetailHeader title="Zápas" subtitle="Žádný zápas není vybraný" onBack={() => setTab('match')} />
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
          <p className="mt-0.5 text-[13px] font-medium text-muted">k dispozici {match.availablePlayerIds.length}{match.rotateGoalkeeper ? ' · točí se i brankář' : ''}</p>
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
        <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] opacity-80">Během zápasu</span>
        <p className="mt-1.5 text-[14px] font-semibold leading-[1.5] opacity-90">Zahájení nasadí osmičku na hřiště. Střídáš dvěma tapy (hráč na hřišti + hráč na lavičce) a plánovanou rotaci provedeš jedním tlačítkem.</p>
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

// ---------------------------------------------------------------------------

function FinishedView({ match }: { match: Match }) {
  const players = useStore((s) => s.players);
  const lineups = useStore((s) => s.lineups);
  const formations = useStore((s) => s.formations);
  const setTab = useStore((s) => s.setTab);
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const byId = new Map(players.map((p) => [p.id, p]));
  const played = appeared(match.events);
  const available = match.availablePlayerIds.filter((id) => byId.has(id));
  const didPlay = available.filter((id) => played.has(id)).map((id) => byId.get(id)!).sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  const didNot = available.filter((id) => !played.has(id)).map((id) => byId.get(id)!).sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  const subs = match.events.filter((e) => e.type === 'SUB').length;
  const pitch = computeOnPitch(match.events);
  const l = match.startingLineupId ? lineups.find((x) => x.id === match.startingLineupId) : undefined;
  const formation = (l && formations.find((f) => f.id === l.formationId)) ?? formations[0];

  return (
    <div className="h-full overflow-y-auto px-[18px] pb-5 pt-5">
      <div className="mb-3.5 rounded-[22px] border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <span className="eyebrow block truncate">Dohráno · vs {match.opponent}</span>
            <p className="mt-1 text-[24px] font-black leading-none tracking-[-0.02em] text-heading">
              {didPlay.length} z {available.length} hrálo
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-role-midc/15 px-3 py-1.5 text-[11px] font-extrabold tracking-[0.06em] text-role-midc-text">V SEZÓNĚ</span>
        </div>
        <p className="mt-2.5 text-[12px] font-semibold text-muted">{subs} střídání · účast je započítaná do sezónního přehledu na Kádru.</p>
      </div>

      {formation && (
        <div className="mb-3.5 overflow-hidden rounded-[22px] bg-pitch shadow-card">
          <div className="aspect-[2/3] w-full">
            <Pitch>
              {formation.slots.map((slot) => {
                const pid = pitch[slot.id] ?? null;
                return <SlotMarker key={slot.id} slot={slot} player={pid ? (byId.get(pid) ?? null) : null} visual="normal" />;
              })}
            </Pitch>
          </div>
        </div>
      )}

      <h2 className="eyebrow mb-2">Hráli ({didPlay.length})</h2>
      <p className="mb-3.5 text-[15px] font-semibold leading-[1.6] text-ink">{didPlay.map((p) => p.name).join(', ') || '—'}</p>
      {didNot.length > 0 && (
        <>
          <h2 className="eyebrow mb-2 !text-accent-text">Nehráli ({didNot.length})</h2>
          <p className="mb-3.5 text-[15px] font-semibold leading-[1.6] text-accent-text">{didNot.map((p) => p.name).join(', ')}</p>
        </>
      )}

      <Btn
        className="mt-2 min-h-[52px] w-full rounded-[18px]"
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
  const act = useStore();

  const [sel, setSel] = useState<Sel>(null);
  const [rotationOpen, setRotationOpen] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const toastSeq = useRef(0);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const formation: Formation | undefined = useMemo(() => {
    const l = match.startingLineupId ? lineups.find((x) => x.id === match.startingLineupId) : undefined;
    return (l && formations.find((f) => f.id === l.formationId)) ?? formations[0];
  }, [match.startingLineupId, lineups, formations]);

  const pitch = useMemo(() => computeOnPitch(match.events), [match.events]);
  const onPitchIds = useMemo(() => new Set(Object.values(pitch)), [pitch]);
  const available = useMemo(() => match.availablePlayerIds.filter((id) => playerById.has(id)), [match.availablePlayerIds, playerById]);
  // Order key: when the player last left the pitch (never played = 0) – the longest-waiting comes first.
  const priority = useMemo(() => lastOffOrder(match.events), [match.events]);
  const bench = useMemo(
    () =>
      available
        .filter((id) => !onPitchIds.has(id))
        .map((id) => playerById.get(id)!)
        .sort((a, b) => (priority[a.id] ?? 0) - (priority[b.id] ?? 0) || a.name.localeCompare(b.name, 'cs')),
    [available, onPitchIds, playerById, priority],
  );
  const never = useMemo(() => new Set(available.filter((id) => !appeared(match.events).has(id))), [available, match.events]);
  const subsCount = match.events.filter((e) => e.type === 'SUB').length;

  function showToast(text: string, undoable = true) {
    setToast({ text, undoable, id: ++toastSeq.current });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  }
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const name = (id: string | null | undefined) => (id ? (playerById.get(id)?.name ?? id) : '');

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
    if (sel?.kind === 'bench') return doSub(slotId, sel.playerId);
    setSel(sel?.kind === 'slot' && sel.slotId === slotId ? null : { kind: 'slot', slotId });
  }
  function tapBench(playerId: string) {
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
    return never.has(p.id) ? 'low' : 'normal';
  }

  const rotationInput: RotationInput | null = formation ? { formation, onPitch: pitch, benchIds: bench.map((b) => b.id), players, priority, rotateGoalkeeper: match.rotateGoalkeeper } : null;
  const planPairs: RotationPair[] = rotationInput && formation ? proposeFromPlan(rotationInput, sanitizeGroups(match.rotationGroups ?? {}, formation, available)) : [];
  const planNames = planPairs.map((p) => name(p.onPlayerId)).join(', ');

  function executeRotation(pairs: RotationPair[]) {
    act.substitute(match.id, pairs);
    setRotationOpen(false);
    showToast(`Rotace: ${pairs.map((p) => `${name(p.onPlayerId)}▲${name(p.offPlayerId)}▼`).join('  ')}`);
  }
  const back = () => {
    act.openMatchDetail(match.id);
    act.setTab('match');
  };

  return (
    <div className="no-touch-fx flex h-full flex-col">
      {/* header: opponent, subs count, finish */}
      <div className="px-4 pt-[18px]">
        <div className="flex items-center gap-3 rounded-[22px] bg-primary px-4 py-3.5 text-white" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <button type="button" onClick={back} className="tap -ml-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-white/80" aria-label="Zpět na zápas">
            <IconBack />
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-[7px]">
              <span className="size-[7px] rounded-full bg-gold" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] opacity-85">Hraje se</span>
            </div>
            <p className="truncate text-[22px] font-black leading-none tracking-[-0.02em]">vs {match.opponent}</p>
            <p className="mt-1 text-[12px] font-semibold opacity-80">
              {subsCount} střídání · na hřišti {onPitchIds.size} · lavička {bench.length}
            </p>
          </div>
          <button type="button" onClick={() => setConfirmFinish(true)} className="tap min-h-[52px] shrink-0 rounded-2xl bg-white px-3.5 text-[12px] font-extrabold text-[#161c4b]">
            Konec zápasu
          </button>
        </div>
      </div>

      {/* rotation CTA */}
      <div className="flex gap-2 px-4 pt-2.5">
        <button
          type="button"
          disabled={planPairs.length === 0}
          onClick={() => executeRotation(planPairs)}
          className="tap flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-[20px] bg-accent px-4 text-white disabled:opacity-40"
          style={{ boxShadow: '0 6px 18px rgba(164,23,42,0.28)' }}
        >
          <IconRotate />
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-[17px] font-extrabold tracking-[-0.01em]">Provést rotaci</span>
            <span className="block truncate text-[11px] font-bold opacity-85">{planPairs.length === 0 ? 'nikdo na lavičce' : `${planPairs.length} ${planPairs.length === 1 ? 'dvojice' : planPairs.length < 5 ? 'dvojice' : 'dvojic'} · ${planNames}`}</span>
          </span>
          <span className="tabular shrink-0 rounded-full bg-white/18 px-2.5 py-[5px] text-[12px] font-extrabold tracking-[0.06em]">{planPairs.length}</span>
        </button>
        <button type="button" disabled={!rotationInput || bench.length === 0} onClick={() => setRotationOpen(true)} className="tap flex min-h-16 w-14 items-center justify-center rounded-[20px] border border-line-2 bg-surface text-heading disabled:opacity-40" aria-label="Upravit rotaci">
          <IconPencil />
        </button>
      </div>

      {/* pitch */}
      <div className="min-h-0 flex-1 px-4 pt-2.5">
        <div className="h-full overflow-hidden rounded-[22px] bg-pitch shadow-card">
          {formation && (
            <Pitch>
              {formation.slots.map((slot) => {
                const pid = pitch[slot.id] ?? null;
                return <SlotMarker key={slot.id} slot={slot} player={pid ? (playerById.get(pid) ?? null) : null} visual={slotVisual(slot.id, slot.role)} onTap={() => tapSlot(slot.id)} />;
              })}
            </Pitch>
          )}
        </div>
      </div>

      {/* bench */}
      <div className="px-4 pb-[18px] pt-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="eyebrow truncate">
            {sel?.kind === 'slot' ? `${name(pitch[sel.slotId]) || 'Prázdný slot'} · tapni, kdo jde na hřiště` : sel?.kind === 'bench' ? `${selPlayer?.name} · tapni, koho střídá` : `Lavička ${bench.length}`}
          </p>
          {!sel && <p className="shrink-0 text-[11px] font-semibold text-faint">nejdéle čeká vlevo · červeně ještě nehrál</p>}
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" style={{ touchAction: 'pan-x' }}>
          {sel?.kind === 'slot' && pitch[sel.slotId] && (
            <button type="button" onClick={takeOff} className="tap flex min-h-[74px] w-[90px] shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent-line bg-accent-soft px-1 text-[13px] font-extrabold text-accent-text">
              ▼ jen dolů
            </button>
          )}
          {bench.map((p) => (
            <BenchTile key={p.id} player={p} sub={never.has(p.id) ? 'ještě nehrál' : `${ROLE_SHORT[p.roles[0] ?? 'FWD']}`} visual={tileVisual(p)} onTap={() => tapBench(p.id)} width={90} />
          ))}
          {bench.length === 0 && <p className="self-center px-2 text-[13px] text-muted">Lavička je prázdná.</p>}
        </div>
      </div>

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

      {rotationOpen && rotationInput && <RotationSheet input={rotationInput} initialPairs={planPairs} onConfirm={executeRotation} onClose={() => setRotationOpen(false)} />}
      {confirmFinish && (
        <Confirm
          title="Ukončit zápas?"
          text="Zápas se uzavře a účast hráčů se započítá do sezónního přehledu. Střídání už nepůjde měnit."
          confirmLabel="Ukončit"
          danger
          onCancel={() => setConfirmFinish(false)}
          onConfirm={() => {
            act.finishMatch(match.id);
            setConfirmFinish(false);
          }}
        />
      )}
    </div>
  );
}
