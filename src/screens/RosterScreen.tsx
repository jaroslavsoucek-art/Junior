import { useMemo, useState } from 'react';
import { ACTIVE_TEAM, useStore } from '../store';
import { NoRoleChip, RoleChip, TeamChip } from '../components/RoleChip';
import { Btn, Modal } from '../components/Modal';
import { otherTeam, readTeamPlayers } from '../lib/team';
import { SEED_PLAYERS_BY_TEAM } from '../data/seed';
import { PlayerEditor } from '../components/PlayerEditor';
import { ScreenHeader } from '../components/ScreenHeader';
import { SettingsScreen } from './SettingsScreen';
import { formatMinutes, seasonSeconds } from '../lib/season';
import { ALL_ROLES, ROLE_LABEL, type Player, type PositionRole } from '../types';

type Sort = 'position' | 'minutes';
const ROLE_ORDER: Record<PositionRole, number> = { GK: 0, DEF: 1, MID_C: 2, MID_W: 3, FWD: 4 };
const primaryRole = (p: Player): PositionRole | null => [...p.roles].sort((a, b) => ROLE_ORDER[a] - ROLE_ORDER[b])[0] ?? null;
const roleRank = (p: Player) => { const r = primaryRole(p); return r ? ROLE_ORDER[r] : 9; };

export function RosterScreen() {
  const players = useStore((s) => s.players);
  const matches = useStore((s) => s.matches);
  const addPlayer = useStore((s) => s.addPlayer);
  const updatePlayer = useStore((s) => s.updatePlayer);

  const [sort, setSort] = useState<Sort>('position');
  const [editing, setEditing] = useState<Player | null | 'new'>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [pickFromOther, setPickFromOther] = useState(false);
  const other = otherTeam(ACTIVE_TEAM);

  const season = useMemo(() => seasonSeconds(matches), [matches]);
  const byName = (a: Player, b: Player) => a.name.localeCompare(b.name, 'cs');

  const active = useMemo(() => {
    const list = players.filter((p) => p.active);
    return sort === 'position'
      ? list.sort((a, b) => roleRank(a) - roleRank(b) || byName(a, b))
      : list.sort((a, b) => (season[a.id] ?? 0) - (season[b.id] ?? 0) || byName(a, b));
  }, [players, sort, season]);
  const inactive = useMemo(() => players.filter((p) => !p.active).sort(byName), [players]);

  if (showSettings) return <SettingsScreen onBack={() => setShowSettings(false)} />;

  // Position sort renders group headings: Brankář, Obrana, Střed, Křídlo, Útok.
  const groups: { role: PositionRole | 'none' | null; items: Player[] }[] =
    sort === 'position'
      ? [
          ...ALL_ROLES.map((role) => ({ role, items: active.filter((p) => primaryRole(p) === role) })),
          { role: 'none' as const, items: active.filter((p) => primaryRole(p) === null) },
        ].filter((g) => g.items.length)
      : [{ role: null, items: active }];
  const otherPlayers = pickFromOther
    ? readTeamPlayers(other, SEED_PLAYERS_BY_TEAM[other]).filter((p) => !players.some((x) => x.id === p.id)).sort(byName)
    : [];

  return (
    <div className="px-4 pb-4">
      <ScreenHeader
        title="Kádr"
        subtitle={`SK Junior Praha · tým ${ACTIVE_TEAM} · ${active.length} hráčů`}
        right={
          <button type="button" onClick={() => setShowSettings(true)} className="tap rounded-xl px-3 text-2xl" aria-label="Nastavení">
            ⚙️
          </button>
        }
      />

      <div className="mb-3 flex gap-2 no-touch-fx" role="tablist" aria-label="Řazení">
        {(
          [
            ['position', 'Podle postu'],
            ['minutes', 'Podle minut ↑'],
          ] as [Sort, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={sort === id}
            onClick={() => setSort(id)}
            className={`tap flex-1 rounded-xl border-2 px-3 font-semibold ${sort === id ? 'border-primary bg-primary text-white' : 'border-ink/20 bg-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {groups.map((g) => (
        <section key={g.role ?? 'all'} className="mb-3">
          {g.role && (
            <h2 className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-ink-muted">{g.role === 'none' ? 'Bez postu' : ROLE_LABEL[g.role]}</h2>
          )}
          <ul className="flex flex-col gap-2">
            {g.items.map((p) => (
              <PlayerRow key={p.id} player={p} seconds={season[p.id]} onTap={() => setEditing(p)} />
            ))}
          </ul>
        </section>
      ))}

      <Btn onClick={() => setPickFromOther(true)} className="mt-1 w-full">
        + Přidat hráče z týmu {other}
      </Btn>

      {pickFromOther && (
        <Modal title={`Hráči týmu ${other}`} onClose={() => setPickFromOther(false)}>
          {otherPlayers.length === 0 && <p className="text-ink-muted">Všichni z týmu {other} už v tomto kádru jsou.</p>}
          <ul className="flex flex-col gap-2">
            {otherPlayers.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    addPlayer(p);
                    setPickFromOther(false);
                  }}
                  className="tap flex w-full items-center justify-between rounded-xl border border-ink/10 bg-white px-4 text-left"
                >
                  <span className="text-lg font-semibold">{p.name}</span>
                  <span className="flex gap-1">
                    {p.roles.length ? p.roles.map((r) => <RoleChip key={r} role={r} />) : <NoRoleChip />}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-muted">Hráč se přidá do kádru týmu {ACTIVE_TEAM} jako hostující (žlutý štítek). V týmu {other} zůstává.</p>
        </Modal>
      )}

      {inactive.length > 0 && (
        <div className="mt-6">
          <button type="button" onClick={() => setShowInactive((v) => !v)} className="tap flex w-full items-center justify-between px-1 text-ink-muted" aria-expanded={showInactive}>
            <span className="font-semibold">Mimo kádr ({inactive.length})</span>
            <span>{showInactive ? '▲' : '▼'}</span>
          </button>
          {showInactive && (
            <ul className="mt-2 flex flex-col gap-2 opacity-70">
              {inactive.map((p) => (
                <PlayerRow key={p.id} player={p} seconds={season[p.id]} onTap={() => setEditing(p)} />
              ))}
            </ul>
          )}
        </div>
      )}

      {editing !== null && (
        <PlayerEditor
          player={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(name, roles, isActive) => {
            if (editing !== 'new') updatePlayer(editing.id, { name, roles, active: isActive });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function PlayerRow({ player, seconds, onTap }: { player: Player; seconds: number | undefined; onTap: () => void }) {
  return (
    <li>
      <button type="button" onClick={onTap} className="tap flex w-full items-center justify-between rounded-xl border border-ink/10 bg-white px-4 py-2 text-left">
        <span className="flex flex-col">
          <span className="text-lg font-semibold">{player.name}</span>
          <span className="text-sm text-ink-muted">{formatMinutes(seconds)}</span>
        </span>
        <span className="flex gap-1">
          {player.team && player.team !== ACTIVE_TEAM && <TeamChip team={player.team} />}
          {player.roles.length ? player.roles.map((r) => <RoleChip key={r} role={r} />) : <NoRoleChip />}
        </span>
      </button>
    </li>
  );
}
