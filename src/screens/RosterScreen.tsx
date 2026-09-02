import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { RoleChip } from '../components/RoleChip';
import { Btn } from '../components/Modal';
import { PlayerEditor } from '../components/PlayerEditor';
import { SettingsScreen } from './SettingsScreen';
import { formatMinutes, seasonSeconds } from '../lib/season';
import type { Player } from '../types';

type Sort = 'name' | 'minutes';

export function RosterScreen() {
  const players = useStore((s) => s.players);
  const matches = useStore((s) => s.matches);
  const addPlayer = useStore((s) => s.addPlayer);
  const updatePlayer = useStore((s) => s.updatePlayer);

  const [sort, setSort] = useState<Sort>('name');
  const [editing, setEditing] = useState<Player | null | 'new'>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const season = useMemo(() => seasonSeconds(matches), [matches]);

  const sorted = useMemo(() => {
    const cmp =
      sort === 'name'
        ? (a: Player, b: Player) => a.name.localeCompare(b.name, 'cs')
        : (a: Player, b: Player) => (season[a.id] ?? 0) - (season[b.id] ?? 0) || a.name.localeCompare(b.name, 'cs');
    return [...players].sort(cmp);
  }, [players, sort, season]);

  const active = sorted.filter((p) => p.active);
  const inactive = sorted.filter((p) => !p.active);

  if (showSettings) return <SettingsScreen onBack={() => setShowSettings(false)} />;

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center justify-between py-3">
        <h1 className="text-2xl font-bold">Kádr</h1>
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="tap rounded-xl px-3 text-2xl"
          aria-label="Nastavení"
        >
          ⚙️
        </button>
      </div>

      <div className="mb-3 flex gap-2 no-touch-fx" role="tablist" aria-label="Řazení">
        {(
          [
            ['name', 'Podle jména'],
            ['minutes', 'Podle minut ↑'],
          ] as [Sort, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={sort === id}
            onClick={() => setSort(id)}
            className={`tap flex-1 rounded-xl border-2 px-3 font-semibold ${
              sort === id ? 'border-pitch bg-pitch text-white' : 'border-ink/20 bg-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {active.map((p) => (
          <PlayerRow key={p.id} player={p} seconds={season[p.id]} onTap={() => setEditing(p)} />
        ))}
      </ul>

      <Btn onClick={() => setEditing('new')} className="mt-3 w-full">
        + Přidat hráče
      </Btn>

      {inactive.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowInactive((v) => !v)}
            className="tap flex w-full items-center justify-between px-1 text-ink-muted"
            aria-expanded={showInactive}
          >
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
            if (editing === 'new') addPlayer(name, roles);
            else updatePlayer(editing.id, { name, roles, active: isActive });
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
      <button
        type="button"
        onClick={onTap}
        className="tap flex w-full items-center justify-between rounded-xl border border-ink/10 bg-white px-4 py-2 text-left"
      >
        <span className="flex flex-col">
          <span className="text-lg font-semibold">{player.name}</span>
          <span className="text-sm text-ink-muted">{formatMinutes(seconds)}</span>
        </span>
        <span className="flex gap-1">
          {player.roles.map((r) => (
            <RoleChip key={r} role={r} />
          ))}
        </span>
      </button>
    </li>
  );
}
