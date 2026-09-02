import { useMemo, useState } from 'react';
import { ACTIVE_TEAM, useStore } from '../store';
import { NoRoleChip, RoleChip, RoleSquare, TeamTag } from '../components/RoleChip';
import { ROLE_BG } from '../lib/roleStyles';
import { Btn, Modal } from '../components/Modal';
import { ScreenHeader, IconButton } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { IconChevronDown, IconChevronRight, IconGear, IconPlus } from '../components/icons';
import { PlayerEditor } from '../components/PlayerEditor';
import { SettingsScreen } from './SettingsScreen';
import { appearances, formatAppearances } from '../lib/season';
import { otherTeam, readTeamPlayers } from '../lib/team';
import { SEED_PLAYERS_BY_TEAM } from '../data/seed';
import { ALL_ROLES, ROLE_LABEL, type Player, type PositionRole } from '../types';

type Sort = 'position' | 'name';
const ROLE_ORDER: Record<PositionRole, number> = { GK: 0, DEF: 1, MID_C: 2, MID_W: 3, FWD: 4 };
const primaryRole = (p: Player): PositionRole | null => [...p.roles].sort((a, b) => ROLE_ORDER[a] - ROLE_ORDER[b])[0] ?? null;
const roleRank = (p: Player) => {
  const r = primaryRole(p);
  return r ? ROLE_ORDER[r] : 9;
};

export function RosterScreen() {
  const players = useStore((s) => s.players);
  const matches = useStore((s) => s.matches);
  const addPlayer = useStore((s) => s.addPlayer);
  const updatePlayer = useStore((s) => s.updatePlayer);

  const [sort, setSort] = useState<Sort>('position');
  const [editing, setEditing] = useState<Player | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [pickFromOther, setPickFromOther] = useState(false);
  const other = otherTeam(ACTIVE_TEAM);

  const apps = useMemo(() => appearances(matches), [matches]);
  const finished = matches.filter((m) => m.status === 'finished').length;
  const byName = (a: Player, b: Player) => a.name.localeCompare(b.name, 'cs');

  const active = useMemo(() => {
    const list = players.filter((p) => p.active);
    return sort === 'position' ? list.sort((a, b) => roleRank(a) - roleRank(b) || byName(a, b)) : list.sort(byName);
  }, [players, sort]);
  const inactive = useMemo(() => players.filter((p) => !p.active).sort(byName), [players]);

  if (showSettings) return <SettingsScreen onBack={() => setShowSettings(false)} />;

  const groups: { role: PositionRole | 'none' | null; items: Player[] }[] =
    sort === 'position'
      ? [...ALL_ROLES.map((role) => ({ role, items: active.filter((p) => primaryRole(p) === role) })), { role: 'none' as const, items: active.filter((p) => primaryRole(p) === null) }].filter((g) => g.items.length)
      : [{ role: null, items: active }];
  const otherPlayers = pickFromOther ? readTeamPlayers(other, SEED_PLAYERS_BY_TEAM[other]).filter((p) => !players.some((x) => x.id === p.id)).sort(byName) : [];

  return (
    <div className="px-[18px] pb-[100px] pt-5">
      <ScreenHeader
        title="Kádr"
        subtitle={`${active.length} hráčů · ${finished} ${finished === 1 ? 'zápas odehraný' : finished >= 2 && finished <= 4 ? 'zápasy odehrané' : 'zápasů odehraných'}`}
        right={
          <IconButton onClick={() => setShowSettings(true)} label="Nastavení">
            <IconGear />
          </IconButton>
        }
      />

      <div className="mb-[18px]">
        <Segmented value={sort} onChange={setSort} options={[{ value: 'position', label: 'Podle postu' }, { value: 'name', label: 'Podle jména' }]} />
      </div>

      {groups.map((g) => (
        <section key={g.role ?? 'all'} className="mb-5">
          {g.role && (
            <div className="mb-2.5 flex items-center gap-2">
              {g.role !== 'none' && <span className={`size-2 rounded-full ${ROLE_BG[g.role]}`} aria-hidden />}
              <h2 className="eyebrow">{g.role === 'none' ? 'Bez postu' : ROLE_LABEL[g.role]}</h2>
              <span className="h-px flex-1 bg-line" />
              <span className="text-[11px] font-bold text-faint">{g.items.length}</span>
            </div>
          )}
          <ul className="flex flex-col gap-2">
            {g.items.map((p) => (
              <PlayerRow key={p.id} player={p} apps={apps[p.id] ?? 0} onTap={() => setEditing(p)} />
            ))}
          </ul>
        </section>
      ))}

      <Btn kind="soft" className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[18px]" onClick={() => setPickFromOther(true)}>
        <IconPlus />
        Přidat hráče z týmu {other}
      </Btn>

      {inactive.length > 0 && (
        <div className="mt-4 rounded-[22px] border border-line bg-surface p-4">
          <button type="button" onClick={() => setShowInactive((v) => !v)} className="tap flex min-h-12 w-full items-center justify-between text-left" aria-expanded={showInactive}>
            <span className="text-[14px] font-bold text-ink">Mimo kádr</span>
            <span className="flex items-center gap-2 text-[12px] font-bold text-muted">
              {inactive.length} <IconChevronDown className={`text-chev transition-transform ${showInactive ? 'rotate-180' : ''}`} />
            </span>
          </button>
          {showInactive && (
            <ul className="mt-2.5 flex flex-col gap-2 opacity-60">
              {inactive.map((p) => {
                const r = primaryRole(p);
                return (
                  <li key={p.id}>
                    <button type="button" onClick={() => setEditing(p)} className="tap flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line px-3 text-left">
                      {r ? <RoleSquare role={r} size={34} /> : <span className="size-[34px]" />}
                      <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">{p.name}</span>
                      <span className="tabular text-[12px] font-bold text-muted">{formatAppearances(apps[p.id])}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {pickFromOther && (
        <Modal title={`Hráči týmu ${other}`} subtitle={`Přidají se do kádru týmu ${ACTIVE_TEAM} jako hostující, v týmu ${other} zůstávají`} onClose={() => setPickFromOther(false)}>
          {otherPlayers.length === 0 && <p className="text-muted">Všichni z týmu {other} už v tomto kádru jsou.</p>}
          <ul className="flex flex-col gap-2">
            {otherPlayers.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    addPlayer(p);
                    setPickFromOther(false);
                  }}
                  className="tap flex min-h-14 w-full items-center justify-between rounded-[18px] border border-line bg-surface px-4 text-left"
                >
                  <span className="text-[16px] font-bold text-ink">{p.name}</span>
                  <span className="flex gap-1">{p.roles.length ? p.roles.map((r) => <RoleChip key={r} role={r} />) : <NoRoleChip />}</span>
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {editing && (
        <PlayerEditor
          player={editing}
          onClose={() => setEditing(null)}
          onSave={(name, roles, isActive) => {
            updatePlayer(editing.id, { name, roles, active: isActive });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function PlayerRow({ player, apps, onTap }: { player: Player; apps: number; onTap: () => void }) {
  const role = primaryRole(player);
  const guest = player.team && player.team !== ACTIVE_TEAM;
  return (
    <li>
      <button type="button" onClick={onTap} className="tap grid min-h-16 w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[18px] border border-line bg-surface px-3.5 py-2.5 text-left">
        {role ? <RoleSquare role={role} /> : <span className="flex size-[38px] items-center justify-center rounded-xl border border-dashed border-line-2 text-[11px] font-extrabold text-faint">?</span>}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[17px] font-bold text-ink">{player.name}</span>
            {guest && <TeamTag team={player.team!} />}
          </span>
          <span className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-muted">
            {player.roles.length === 0 && <NoRoleChip />}
            <span className="tabular">{formatAppearances(apps)}</span>
          </span>
        </span>
        <IconChevronRight className="text-chev" />
      </button>
    </li>
  );
}
