import { useMemo, useState } from 'react';
import { useStore, type MatchInput } from '../store';
import { Btn, Confirm } from '../components/Modal';
import { MatchForm } from '../components/MatchForm';
import { LineupPreview } from '../components/LineupPreview';
import { RotationPlan } from '../components/RotationPlan';
import { ScreenHeader } from '../components/ScreenHeader';
import { RoleDot } from '../components/RoleChip';
import { formatMatchDate, MIN_PLAYERS, startingLineup, todayISO } from '../lib/match';
import type { Match, Player } from '../types';

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
  const settings = useStore((s) => s.settings);
  const createMatch = useStore((s) => s.createMatch);
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const deleteMatch = useStore((s) => s.deleteMatch);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Match | null>(null);

  const sorted = useMemo(
    () =>
      [...matches].sort((a, b) => {
        const rank = (m: Match) => (m.status === 'live' ? 0 : m.status === 'planned' ? 1 : 2);
        return rank(a) - rank(b) || b.date.localeCompare(a.date);
      }),
    [matches],
  );

  const statusLabel: Record<Match['status'], string> = { planned: 'Připraveno', live: 'Hraje se', finished: 'Dohráno' };
  const statusClass: Record<Match['status'], string> = {
    planned: 'bg-ink/10 text-ink',
    live: 'bg-accent text-white',
    finished: 'bg-primary/15 text-primary',
  };

  return (
    <div className="px-4 pb-4">
      <ScreenHeader title="Zápas" subtitle="Docházka → sestava → plán střídání → Live" />
      <Btn kind="primary" className="w-full" onClick={() => setCreating(true)}>
        + Nový zápas
      </Btn>
      {sorted.length === 0 && <p className="mt-6 text-center text-ink-muted">Zatím žádný zápas.</p>}
      <ul className="mt-3 flex flex-col gap-2">
        {sorted.map((m) => (
          <li key={m.id} className="flex gap-2">
            <button
              type="button"
              onClick={() => openMatchDetail(m.id)}
              className="tap flex min-w-0 flex-1 items-center justify-between rounded-xl border border-ink/10 bg-white px-4 py-3 text-left"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-lg font-bold">vs {m.opponent}</span>
                <span className="text-sm text-ink-muted">
                  {formatMatchDate(m.date)} · {m.halvesCount}×{m.halfLengthMin} min · k dispozici {m.availablePlayerIds.length}
                </span>
              </span>
              <span className={`ml-2 shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${statusClass[m.status]}`}>{statusLabel[m.status]}</span>
            </button>
            {m.status !== 'live' && (
              <button
                type="button"
                onClick={() => setConfirmDelete(m)}
                className="tap rounded-xl border border-ink/10 bg-white px-3 text-ink-muted"
                aria-label={`Smazat zápas vs ${m.opponent}`}
              >
                🗑
              </button>
            )}
          </li>
        ))}
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
          initial={{
            opponent: '',
            date: todayISO(),
            halfLengthMin: settings.defaultHalfLengthMin,
            halvesCount: settings.defaultHalvesCount,
            rotationIntervalMin: settings.defaultRotationIntervalMin,
            rotateGoalkeeper: false,
          }}
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

  const squad = useMemo(() => players.filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name, 'cs')), [players]);
  const available = new Set(match.availablePlayerIds);
  const availableCount = squad.filter((p) => available.has(p.id)).length;
  const starting = useMemo(() => startingLineup(match, lineups, formations, players), [match, lineups, formations, players]);
  const lineup = match.startingLineupId ? lineups.find((l) => l.id === match.startingLineupId) : undefined;
  const templates = lineups.filter((l) => !l.matchId).sort((a, b) => b.updatedAt - a.updatedAt);
  const locked = match.status !== 'planned';

  const input: MatchInput = {
    opponent: match.opponent,
    date: match.date,
    halfLengthMin: match.halfLengthMin,
    halvesCount: match.halvesCount,
    rotationIntervalMin: match.rotationIntervalMin,
    rotateGoalkeeper: match.rotateGoalkeeper,
  };

  return (
    <div className="px-4 pb-6">
      <div className="flex items-center gap-2 py-3">
        <button type="button" onClick={onBack} className="tap rounded-xl px-2 text-xl" aria-label="Zpět na seznam">
          ←
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold">vs {match.opponent}</h1>
          <p className="text-sm text-ink-muted">
            {formatMatchDate(match.date)} · {match.halvesCount}×{match.halfLengthMin} min · rotace {match.rotationIntervalMin} min
            {match.rotateGoalkeeper ? ' vč. GK' : ''}
          </p>
        </div>
        {!locked && (
          <button type="button" onClick={() => setEditing(true)} className="tap rounded-xl px-3 font-semibold text-primary" aria-label="Upravit zápas">
            Upravit
          </button>
        )}
      </div>

      {/* Docházka */}
      <section className="mb-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-bold"><Step n={1} /> Docházka</h2>
          <span className={`text-base font-bold tabular-nums ${availableCount < MIN_PLAYERS ? 'text-accent' : 'text-primary'}`}>
            k dispozici {availableCount} / {squad.length}
          </span>
        </div>
        {availableCount < MIN_PLAYERS && (
          <p className="mb-2 rounded-lg bg-accent/10 px-3 py-2 text-sm font-semibold text-accent">
            Méně než {MIN_PLAYERS} hráčů – na 7+1 to nestačí.
          </p>
        )}
        <div className="grid grid-cols-3 gap-2 no-touch-fx">
          {squad.map((p) => (
            <AttendanceTile key={p.id} player={p} present={available.has(p.id)} disabled={locked} onTap={() => act.toggleAvailability(match.id, p.id)} />
          ))}
        </div>
      </section>

      {/* Sestava */}
      <section className="mb-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-bold"><Step n={2} /> Startovní sestava</h2>
          {lineup && (
            <span className={`text-base font-bold tabular-nums ${starting.filled < 8 ? 'text-accent' : 'text-primary'}`}>{starting.filled} / 8</span>
          )}
        </div>

        {!lineup || pickLineup ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white p-3">
            <p className="text-sm font-semibold text-ink-muted">Načíst uloženou sestavu</p>
            {templates.length === 0 && <p className="text-sm text-ink-muted">Žádná uložená. Sestav ji v tabu Sestava a ulož, nebo začni novou níž.</p>}
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
                    className="tap flex items-center justify-between rounded-xl border-2 border-ink/15 px-3 text-left"
                  >
                    <span className="font-bold">{l.name}</span>
                    <span className="text-sm text-ink-muted">
                      {f?.name}
                      {absent > 0 && <span className="ml-2 font-semibold text-accent">chybí {absent}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-sm font-semibold text-ink-muted">Nebo nová sestava pro tento zápas – vyber formaci</p>
            <div className="flex flex-wrap gap-2">
              {formations.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => act.createMatchLineup(match.id, f.id)}
                  className="tap rounded-xl border-2 border-ink/15 bg-white px-3 text-lg font-bold"
                >
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
          <div className="rounded-2xl border border-ink/10 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold">
                {lineup.name}
                {lineup.matchId ? '' : <span className="ml-2 text-xs font-semibold text-ink-muted">šablona</span>}
              </span>
              <span className="text-sm text-ink-muted">{starting.formation?.name}</span>
            </div>
            {starting.formation && (
              <LineupPreview
                formation={starting.formation}
                assignments={starting.assignments}
                missingSlotIds={starting.missingSlotIds}
                players={players}
                onTap={locked ? undefined : () => act.editMatchLineup(match.id)}
              />
            )}
            {starting.missingPlayerIds.length > 0 && (
              <p className="mt-2 rounded-lg bg-accent/10 px-3 py-2 text-sm font-semibold text-accent">
                Chybí: {starting.missingPlayerIds.map((id) => players.find((p) => p.id === id)?.name ?? id).join(', ')} – sloty zůstaly prázdné.
              </p>
            )}
            {!locked && (
              <div className="mt-3 flex gap-2">
                <Btn className="flex-1" onClick={() => setPickLineup(true)}>
                  Vyměnit
                </Btn>
                <Btn kind="primary" className="flex-1" onClick={() => act.editMatchLineup(match.id)}>
                  Upravit pro zápas
                </Btn>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Plán střídání */}
      {lineup && !pickLineup && starting.formation && (
        <section className="mb-5">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-lg font-bold"><Step n={3} /> Střídání a rotace</h2>
            <span className="text-sm text-ink-muted">každých {match.rotationIntervalMin} min</span>
          </div>
          <RotationPlan
            match={match}
            starting={starting}
            players={players}
            locked={locked}
            onSet={(pid, slotId) => act.setRotationPartner(match.id, pid, slotId)}
            onAuto={() => act.autoPlanRotation(match.id)}
          />
        </section>
      )}

      {/* Start */}
      {match.status === 'planned' && (
        <h2 className="mb-2 text-lg font-bold"><Step n={4} /> Zápas</h2>
      )}
      {match.status === 'planned' && (
        <section className="mb-5">
          <Btn
            kind="primary"
            className="w-full py-4 text-lg"
            disabled={starting.filled < 8 || availableCount < MIN_PLAYERS}
            onClick={() => {
              act.setActiveMatch(match.id);
              act.setTab('live');
            }}
          >
            Přejít na Live
          </Btn>
          {(starting.filled < 8 || availableCount < MIN_PLAYERS) && (
            <p className="mt-2 text-center text-sm text-ink-muted">Nejdřív doplň docházku a kompletní startovní osmičku.</p>
          )}
        </section>
      )}
      {match.status !== 'planned' && (
        <Btn
          kind="primary"
          className="w-full py-4 text-lg"
          onClick={() => {
            act.setActiveMatch(match.id);
            act.setTab('live');
          }}
        >
          {match.status === 'live' ? 'Zpět do Live' : 'Zobrazit průběh'}
        </Btn>
      )}

      {!locked && (
        <Btn kind="ghost" className="mt-6 w-full text-accent" onClick={() => setConfirmDelete(true)}>
          Smazat zápas
        </Btn>
      )}

      {editing && <MatchForm title="Upravit zápas" initial={input} onSave={(v) => { act.updateMatch(match.id, v); setEditing(false); }} onClose={() => setEditing(false)} />}
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

function Step({ n }: { n: number }) {
  return <span className="mr-1 inline-flex size-6 items-center justify-center rounded-full bg-primary text-sm text-white">{n}</span>;
}

function AttendanceTile({ player, present, disabled, onTap }: { player: Player; present: boolean; disabled: boolean; onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      aria-pressed={present}
      className={`tap flex h-16 flex-col items-center justify-center rounded-xl border-2 px-1 ${
        present ? 'border-primary bg-primary text-white' : 'border-ink/15 bg-white text-ink-muted line-through'
      } disabled:opacity-70`}
    >
      <span className="max-w-full truncate text-base font-bold">{player.name}</span>
      <span className="flex gap-1">
        {player.roles.map((r) => (
          <RoleDot key={r} role={r} />
        ))}
      </span>
    </button>
  );
}
