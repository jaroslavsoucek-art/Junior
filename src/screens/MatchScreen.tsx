import { useMemo, useState } from 'react';
import { useStore, type MatchInput } from '../store';
import { Btn, Card, Confirm, Modal, StepBadge } from '../components/Modal';
import { MatchForm } from '../components/MatchForm';
import { LineupPreview } from '../components/LineupPreview';
import { RotationPlan } from '../components/RotationPlan';
import { DetailHeader, ScreenHeader } from '../components/ScreenHeader';
import { IconChevronRight, IconTimer, IconTrash } from '../components/icons';
import { useNow } from '../hooks/useNow';
import { formatMatchDate, MIN_PLAYERS, startingLineup, todayISO } from '../lib/match';
import { clockState, computeMinutes, formatClock, periodElapsedSec } from '../lib/minutes';
import { playSecondsSince, rotationAnchor, sanitizeGroups } from '../lib/rotation';
import { ROLE_SHORT, type Match, type Player, type PositionRole } from '../types';

export function MatchScreen() {
  const matches = useStore((s) => s.matches);
  const matchDetailId = useStore((s) => s.matchDetailId);
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const open = matches.find((m) => m.id === matchDetailId);
  if (open) return <MatchDetail match={open} onBack={() => openMatchDetail(null)} />;
  return <MatchList />;
}

// ---------------------------------------------------------------------------

function MatchList() {
  const matches = useStore((s) => s.matches);
  const lineups = useStore((s) => s.lineups);
  const formations = useStore((s) => s.formations);
  const players = useStore((s) => s.players);
  const settings = useStore((s) => s.settings);
  const createMatch = useStore((s) => s.createMatch);
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const deleteMatch = useStore((s) => s.deleteMatch);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Match | null>(null);
  const live = matches.find((m) => m.status === 'live');
  const now = useNow(!!live && clockState(live).kind === 'running');

  const sorted = useMemo(
    () =>
      [...matches].sort((a, b) => {
        const rank = (m: Match) => (m.status === 'live' ? 0 : m.status === 'planned' ? 1 : 2);
        return rank(a) - rank(b) || b.date.localeCompare(a.date);
      }),
    [matches],
  );

  const avgMin = (m: Match) => {
    const secs = computeMinutes(m, m.events.reduce((a, e) => Math.max(a, e.at), 0));
    const ids = m.availablePlayerIds;
    if (!ids.length) return 0;
    return Math.round(ids.reduce((a, id) => a + (secs[id] ?? 0), 0) / ids.length / 60);
  };

  return (
    <div className="px-[18px] pb-[100px] pt-5">
      <ScreenHeader
        title="Zápasy"
        subtitle="Docházka → sestava → rotace → Live"
        showLogo={false}
        right={
          <Btn kind="primary" className="min-h-12 px-4" onClick={() => setCreating(true)}>
            + Nový
          </Btn>
        }
      />
      {sorted.length === 0 && <p className="mt-6 text-center text-muted">Zatím žádný zápas.</p>}
      <ul className="flex flex-col gap-2.5">
        {sorted.map((m) => {
          const st = startingLineup(m, lineups, formations, players);
          const steps = [m.availablePlayerIds.length >= MIN_PLAYERS, st.filled === 8, Object.keys(m.rotationGroups ?? {}).length > 0, m.status !== 'planned'];
          if (m.status === 'live') {
            const cs = clockState(m);
            const period = cs.kind === 'running' || cs.kind === 'stopped' ? cs.period : 1;
            const anchor = rotationAnchor(m.events);
            const remaining = anchor === null ? null : m.rotationIntervalMin * 60 - playSecondsSince(m.events, anchor, now);
            return (
              <li key={m.id}>
                <button type="button" onClick={() => openMatchDetail(m.id)} className="tap flex min-h-[92px] w-full flex-col gap-2.5 rounded-[20px] bg-accent px-4 py-3.5 text-left text-white" style={{ boxShadow: '0 6px 18px rgba(164,23,42,0.24)' }}>
                  <span className="flex w-full items-center justify-between gap-2.5">
                    <span className="truncate text-[18px] font-extrabold tracking-[-0.01em]">vs {m.opponent}</span>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1">
                      <span className="size-[7px] rounded-full bg-gold" />
                      <span className="text-[11px] font-extrabold tracking-[0.06em]">HRAJE SE</span>
                    </span>
                  </span>
                  <span className="tabular flex flex-wrap items-center gap-3 text-[12px] font-bold opacity-90">
                    <span>
                      {period}. půle · {formatClock(periodElapsedSec(m, period, now))}
                    </span>
                    <span>k dispozici {m.availablePlayerIds.length}</span>
                    {remaining !== null && <span>{remaining <= 0 ? 'rotace teď' : `rotace za ${formatClock(remaining)}`}</span>}
                  </span>
                </button>
              </li>
            );
          }
          return (
            <li key={m.id} className="flex gap-2">
              <button type="button" onClick={() => openMatchDetail(m.id)} className="tap flex min-h-20 min-w-0 flex-1 flex-col gap-2 rounded-[20px] border border-line bg-surface px-4 py-3.5 text-left">
                <span className="flex w-full items-center justify-between gap-2.5">
                  <span className="truncate text-[17px] font-bold text-ink">vs {m.opponent}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.06em] ${m.status === 'planned' ? 'bg-primary/10 text-heading' : 'bg-ink/5 text-muted'}`}>{m.status === 'planned' ? 'PŘIPRAVENO' : 'DOHRÁNO'}</span>
                </span>
                <span className="text-[12px] font-semibold text-muted">
                  {formatMatchDate(m.date)} · {m.halvesCount}×{m.halfLengthMin} min · {m.status === 'planned' ? `k dispozici ${m.availablePlayerIds.length} · sestava ${st.filled}/8` : `ø ${avgMin(m)} min na hráče`}
                </span>
                {m.status === 'planned' && (
                  <span className="flex w-full gap-1">
                    {steps.map((done, i) => (
                      <span key={i} className={`h-[3px] flex-1 rounded-full ${done ? ['bg-primary', 'bg-accent', 'bg-gold', 'bg-primary'][i] : 'bg-ink/10'}`} />
                    ))}
                  </span>
                )}
              </button>
              <button type="button" onClick={() => setConfirmDelete(m)} className="tap flex w-12 items-center justify-center rounded-[20px] border border-line bg-surface text-faint" aria-label={`Smazat zápas vs ${m.opponent}`}>
                <IconTrash />
              </button>
            </li>
          );
        })}
      </ul>

      {confirmDelete && (
        <Confirm
          title={`Smazat zápas vs ${confirmDelete.opponent}?`}
          text={confirmDelete.status === 'finished' ? 'Dohraný zápas – jeho minuty zmizí ze sezónního součtu hráčů.' : 'Zápas včetně docházky, zápasové sestavy a plánu střídání zmizí.'}
          confirmLabel="Smazat"
          danger
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            deleteMatch(confirmDelete.id);
            setConfirmDelete(null);
          }}
        />
      )}
      {creating && (
        <MatchForm
          title="Nový zápas"
          initial={{ opponent: '', date: todayISO(), halfLengthMin: settings.defaultHalfLengthMin, halvesCount: settings.defaultHalvesCount, rotationIntervalMin: settings.defaultRotationIntervalMin, rotateGoalkeeper: false }}
          onSave={(input) => {
            createMatch(input);
            setCreating(false);
          }}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function MatchDetail({ match, onBack }: { match: Match; onBack: () => void }) {
  const players = useStore((s) => s.players);
  const lineups = useStore((s) => s.lineups);
  const formations = useStore((s) => s.formations);
  const act = useStore();

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pickLineup, setPickLineup] = useState(false);
  const [allAttendance, setAllAttendance] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  const squad = useMemo(() => players.filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name, 'cs')), [players]);
  const available = new Set(match.availablePlayerIds);
  const availableCount = squad.filter((p) => available.has(p.id)).length;
  const starting = useMemo(() => startingLineup(match, lineups, formations, players), [match, lineups, formations, players]);
  const lineup = match.startingLineupId ? lineups.find((l) => l.id === match.startingLineupId) : undefined;
  const templates = lineups.filter((l) => !l.matchId).sort((a, b) => b.updatedAt - a.updatedAt);
  const locked = match.status !== 'planned';
  const groups = starting.formation ? sanitizeGroups(match.rotationGroups ?? {}, starting.formation, match.availablePlayerIds) : {};
  const onPitchIds = new Set(Object.values(starting.assignments).filter(Boolean));
  const benchIds = match.availablePlayerIds.filter((id) => !onPitchIds.has(id) && players.some((p) => p.id === id && p.active));
  const plannedCount = benchIds.filter((id) => Object.values(groups).some((g) => g.includes(id))).length;
  const ready = starting.filled === 8 && availableCount >= MIN_PLAYERS;
  const steps = [availableCount >= MIN_PLAYERS, starting.filled === 8, plannedCount > 0 || benchIds.length === 0, match.status !== 'planned'];

  // Attendance: absent players first so they stay visible when collapsed, then present; collapsed shows 5 + "+N".
  const ordered = useMemo(() => [...squad.filter((p) => !available.has(p.id)), ...squad.filter((p) => available.has(p.id))], [squad, match.availablePlayerIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const visible = allAttendance ? ordered : ordered.slice(0, 5);
  const hidden = ordered.length - visible.length;

  const input: MatchInput = { opponent: match.opponent, date: match.date, halfLengthMin: match.halfLengthMin, halvesCount: match.halvesCount, rotationIntervalMin: match.rotationIntervalMin, rotateGoalkeeper: match.rotateGoalkeeper };
  const missingNames = starting.missingPlayerIds.map((id) => players.find((p) => p.id === id)?.name ?? id);
  const missingRoles = starting.missingSlotIds.map((sid) => starting.formation?.slots.find((s) => s.id === sid)?.role).filter(Boolean) as PositionRole[];

  return (
    <div className="relative h-full">
      <div className="h-full overflow-y-auto px-[18px] pb-[120px] pt-[18px]">
        <DetailHeader
          title={`vs ${match.opponent}`}
          subtitle={`${formatMatchDate(match.date)} · ${match.halvesCount}×${match.halfLengthMin} min · rotace ${match.rotationIntervalMin} min${match.rotateGoalkeeper ? ' vč. GK' : ''}`}
          onBack={onBack}
          right={
            match.status !== 'finished' ? (
              <button type="button" onClick={() => setEditing(true)} className="tap min-h-10 rounded-full border border-primary/20 px-3.5 text-[13px] font-bold text-heading" aria-label="Upravit zápas">
                Upravit
              </button>
            ) : undefined
          }
        />

        <div className="mb-[18px] flex gap-1.5">
          {steps.map((done, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${done ? ['bg-primary', 'bg-accent', 'bg-gold', 'bg-primary'][i] : 'bg-ink/10'}`} />
          ))}
        </div>

        {/* 1 Docházka */}
        <Card className="mb-3.5">
          <div className="mb-3.5 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <StepBadge n={1} />
              <h2 className="text-[16px] font-bold text-ink">Docházka</h2>
            </div>
            <span className={`tabular text-[13px] font-extrabold ${availableCount < MIN_PLAYERS ? 'text-accent-text' : 'text-heading'}`}>
              {availableCount} / {squad.length}
            </span>
          </div>
          {availableCount < MIN_PLAYERS && <p className="mb-2.5 rounded-xl bg-accent-soft px-3 py-2 text-[12px] font-bold text-accent-text">Méně než {MIN_PLAYERS} hráčů – na 7+1 to nestačí.</p>}
          <div className="no-touch-fx grid grid-cols-3 gap-2">
            {visible.map((p) => (
              <AttendanceTile key={p.id} player={p} present={available.has(p.id)} disabled={locked} onTap={() => act.toggleAvailability(match.id, p.id)} />
            ))}
            {!allAttendance && hidden > 0 && (
              <button type="button" onClick={() => setAllAttendance(true)} className="tap flex min-h-14 flex-col items-center justify-center gap-1 rounded-[14px] border border-dashed border-line-2 bg-ink/[0.02] text-muted">
                <span className="text-[14px] font-bold">+{hidden}</span>
                <span className="text-[10px] font-bold tracking-[0.06em]">VŠICHNI</span>
              </button>
            )}
            {allAttendance && ordered.length > 5 && (
              <button type="button" onClick={() => setAllAttendance(false)} className="tap flex min-h-14 flex-col items-center justify-center gap-1 rounded-[14px] border border-dashed border-line-2 bg-ink/[0.02] text-muted">
                <span className="text-[10px] font-bold tracking-[0.06em]">SBALIT</span>
              </button>
            )}
          </div>
        </Card>

        {/* 2 Startovní sestava */}
        <Card className="mb-3.5">
          <div className="mb-3 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <StepBadge n={2} tone="accent" />
              <h2 className="text-[16px] font-bold text-ink">Startovní sestava</h2>
            </div>
            {lineup && <span className={`tabular text-[13px] font-extrabold ${starting.filled < 8 ? 'text-accent-text' : 'text-heading'}`}>{starting.filled} / 8</span>}
          </div>

          {!lineup || pickLineup ? (
            <div className="flex flex-col gap-3">
              <p className="eyebrow">Načíst uloženou sestavu</p>
              {templates.length === 0 && <p className="text-[13px] text-muted">Žádná uložená. Sestav ji v tabu Sestava a ulož, nebo začni novou níž.</p>}
              <div className="flex flex-col gap-2">
                {templates.map((l) => {
                  const f = formations.find((x) => x.id === l.formationId);
                  const absent = Object.values(l.assignments).filter((pid) => pid && !available.has(pid)).length;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        act.setStartingLineup(match.id, l.id);
                        setPickLineup(false);
                      }}
                      className="tap flex min-h-12 items-center justify-between rounded-[14px] border border-line-2 px-3.5 text-left"
                    >
                      <span className="text-[15px] font-bold text-ink">{l.name}</span>
                      <span className="text-[12px] font-semibold text-muted">
                        {f?.name}
                        {absent > 0 && <span className="ml-2 font-bold text-accent-text">chybí {absent}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="eyebrow mt-1">Nebo nová pro tento zápas – vyber formaci</p>
              <div className="flex flex-wrap gap-2">
                {formations.map((f) => (
                  <button key={f.id} type="button" onClick={() => act.createMatchLineup(match.id, f.id)} className="tap rounded-[14px] border border-line-2 bg-surface px-3.5 text-[15px] font-extrabold text-heading">
                    {f.name}
                  </button>
                ))}
              </div>
              {pickLineup && (
                <Btn kind="ghost" onClick={() => setPickLineup(false)}>
                  Zrušit
                </Btn>
              )}
            </div>
          ) : (
            <div className="flex items-stretch gap-3.5">
              {starting.formation && (
                <div className="w-[116px] shrink-0">
                  <LineupPreview formation={starting.formation} assignments={starting.assignments} missingSlotIds={starting.missingSlotIds} players={players} onTap={locked ? undefined : () => act.editMatchLineup(match.id)} />
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div>
                  <p className="truncate text-[15px] font-bold text-ink">{lineup.name}</p>
                  <p className="mt-0.5 text-[12px] font-semibold text-muted">
                    {lineup.matchId ? 'zápasová' : 'šablona'} · formace {starting.formation?.name}
                  </p>
                </div>
                {missingNames.length > 0 && (
                  <div className="rounded-xl bg-gold-soft px-2.5 py-2">
                    <p className="text-[12px] font-bold text-gold-text">
                      {missingNames.join(', ')} chybí — {missingNames.length === 1 ? 'slot' : 'sloty'} {missingRoles.map((r) => ROLE_SHORT[r]).join(', ')} {missingNames.length === 1 ? 'zůstal prázdný' : 'zůstaly prázdné'}.
                    </p>
                  </div>
                )}
                {!locked && (
                  <div className="mt-auto flex gap-1.5">
                    <Btn className="min-h-11 flex-1 rounded-[13px] px-2 py-0 text-[13px]" onClick={() => setPickLineup(true)}>
                      Vyměnit
                    </Btn>
                    <Btn kind="primary" className="min-h-11 flex-[1.4] rounded-[13px] px-2 py-0 text-[13px]" onClick={() => act.editMatchLineup(match.id)}>
                      Upravit
                    </Btn>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* 3 Plán rotace */}
        {lineup && !pickLineup && starting.formation && (
          <button type="button" onClick={() => setPlanOpen(true)} className="tap mb-3.5 flex min-h-[60px] w-full items-center justify-between gap-2.5 rounded-[22px] border border-line bg-surface px-4 text-left">
            <span className="flex items-center gap-2.5">
              <StepBadge n={3} tone={plannedCount > 0 ? 'primary' : 'muted'} />
              <span className="text-[16px] font-bold text-ink">Plán rotace</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-muted">
                {benchIds.length === 0 ? 'nikdo na lavičce' : `${plannedCount} / ${benchIds.length} v plánu`}
              </span>
              <IconChevronRight className="text-chev" />
            </span>
          </button>
        )}

        {match.status !== 'planned' && (
          <Btn
            kind="primary"
            className="min-h-[60px] w-full rounded-[20px] text-[17px] font-extrabold"
            onClick={() => {
              act.setActiveMatch(match.id);
              act.setTab('live');
            }}
          >
            {match.status === 'live' ? 'Zpět do Live' : 'Zobrazit průběh'}
          </Btn>
        )}
        {!locked && (
          <Btn kind="ghost" className="mt-4 w-full text-accent-text" onClick={() => setConfirmDelete(true)}>
            Smazat zápas
          </Btn>
        )}
      </div>

      {/* sticky CTA on a scrim */}
      {match.status === 'planned' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 px-4 pb-4 pt-[34px]" style={{ background: 'linear-gradient(to bottom, transparent 0%, var(--bg) 22%, var(--bg) 100%)' }}>
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              act.setActiveMatch(match.id);
              act.setTab('live');
            }}
            className="tap pointer-events-auto flex min-h-[60px] w-full items-center justify-center gap-2.5 rounded-[20px] bg-accent text-white disabled:opacity-40"
            style={ready ? { boxShadow: '0 8px 24px rgba(164,23,42,0.3)' } : undefined}
          >
            <IconTimer size={20} />
            <span className="text-[17px] font-extrabold tracking-[-0.01em]">Přejít na Live</span>
          </button>
          {!ready && <p className="pointer-events-auto text-center text-[12px] font-semibold text-muted">Nejdřív doplň docházku a kompletní startovní osmičku.</p>}
        </div>
      )}

      {planOpen && starting.formation && (
        <Modal title="Plán rotace" subtitle={`každých ${match.rotationIntervalMin} min · kdo za koho se točí · v Live pak stačí jedno tlačítko`} onClose={() => setPlanOpen(false)}>
          <RotationPlan match={match} starting={starting} players={players} locked={locked} onSet={(pid, slotId) => act.setRotationPartner(match.id, pid, slotId)} onAuto={() => act.autoPlanRotation(match.id)} />
          <Btn kind="primary" className="mt-3.5 w-full" onClick={() => setPlanOpen(false)}>
            Hotovo
          </Btn>
        </Modal>
      )}
      {editing && (
        <MatchForm
          title="Upravit zápas"
          initial={input}
          onSave={(v) => {
            act.updateMatch(match.id, v);
            setEditing(false);
          }}
          onClose={() => setEditing(false)}
        />
      )}
      {confirmDelete && (
        <Confirm
          title="Smazat zápas?"
          text={`Zápas vs ${match.opponent} včetně docházky a zápasové sestavy zmizí.`}
          confirmLabel="Smazat"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            act.deleteMatch(match.id);
            setConfirmDelete(false);
          }}
        />
      )}
    </div>
  );
}

function AttendanceTile({ player, present, disabled, onTap }: { player: Player; present: boolean; disabled: boolean; onTap: () => void }) {
  const role = player.roles[0];
  return (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      aria-pressed={present}
      className={`tap flex min-h-14 flex-col items-center justify-center gap-1 rounded-[14px] px-1 py-1.5 disabled:opacity-70 ${present ? 'bg-btn text-btn-fg' : 'border border-dashed border-line-2 bg-ink/[0.02] text-faint'}`}
    >
      <span className={`max-w-full truncate text-[14px] font-bold ${present ? '' : 'line-through'}`}>{player.name}</span>
      <span className={`text-[10px] font-bold tracking-[0.06em] ${present ? 'opacity-75' : ''}`}>{present ? (role ? ROLE_SHORT[role] : '—') : 'CHYBÍ'}</span>
    </button>
  );
}
