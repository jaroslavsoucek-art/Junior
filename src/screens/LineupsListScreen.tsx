import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { ScreenHeader } from '../components/ScreenHeader';
import { Btn, Confirm } from '../components/Modal';
import { NamePrompt } from '../components/NamePrompt';
import { LineupPreview } from '../components/LineupPreview';
import type { Lineup } from '../types';

/** Sestava tab landing: saved templates first, the editor is one tap away. */
export function LineupsListScreen() {
  const lineups = useStore((s) => s.lineups);
  const formations = useStore((s) => s.formations);
  const matches = useStore((s) => s.matches);
  const players = useStore((s) => s.players);
  const draft = useStore((s) => s.draft);
  const act = useStore();

  const [confirm, setConfirm] = useState<Lineup | null>(null);
  const [renaming, setRenaming] = useState<Lineup | null>(null);
  const [preview, setPreview] = useState<Lineup | null>(null);

  const templates = useMemo(() => lineups.filter((l) => !l.matchId).sort((a, b) => b.updatedAt - a.updatedAt), [lineups]);
  const matchLineups = useMemo(() => lineups.filter((l) => l.matchId).sort((a, b) => b.updatedAt - a.updatedAt), [lineups]);
  const draftFilled = Object.values(draft.assignments).filter(Boolean).length;
  const draftUnsaved = !draft.lineupId && !draft.matchId && draftFilled > 0;

  const openEditor = () => act.setLineupView('editor');
  const fmt = (l: Lineup) => formations.find((f) => f.id === l.formationId);
  const filled = (l: Lineup) => Object.values(l.assignments).filter(Boolean).length;
  const matchName = (l: Lineup) => {
    const m = matches.find((x) => x.id === l.matchId);
    return m ? `vs ${m.opponent}` : 'smazaný zápas';
  };

  return (
    <div className="px-4 pb-4">
      <ScreenHeader title="Sestavy" subtitle="Uložené šablony · tap = otevřít v editoru" />

      <Btn
        kind="primary"
        className="w-full"
        onClick={() => {
          act.clearDraft();
          if (draft.matchId) act.leaveMatchEditing();
          openEditor();
        }}
      >
        + Nová sestava
      </Btn>

      {draftUnsaved && (
        <button type="button" onClick={openEditor} className="tap mt-3 flex w-full items-center justify-between rounded-xl border-2 border-dashed border-accent bg-accent/5 px-4 py-3 text-left">
          <span className="flex flex-col">
            <span className="font-bold text-accent">Rozpracovaná, neuložená</span>
            <span className="text-sm text-ink-muted">{formations.find((f) => f.id === draft.formationId)?.name} · {draftFilled}/8</span>
          </span>
          <span className="font-semibold text-accent">Pokračovat →</span>
        </button>
      )}

      {templates.length === 0 && !draftUnsaved && <p className="mt-6 text-center text-ink-muted">Zatím žádná uložená sestava. Začni novou.</p>}

      <ul className="mt-3 flex flex-col gap-2">
        {templates.map((l) => (
          <LineupRow
            key={l.id}
            lineup={l}
            meta={`${fmt(l)?.name ?? '?'} · ${filled(l)}/8 · ${new Date(l.updatedAt).toLocaleDateString('cs-CZ')}`}
            current={l.id === draft.lineupId && !draft.matchId}
            onOpen={() => {
              act.loadLineup(l.id);
              openEditor();
            }}
            onPreview={() => setPreview(l)}
            onRename={() => setRenaming(l)}
            onDuplicate={() => act.duplicateLineup(l.id)}
            onDelete={() => setConfirm(l)}
          />
        ))}
      </ul>

      {matchLineups.length > 0 && (
        <details className="mt-6">
          <summary className="tap flex cursor-pointer items-center px-1 font-semibold text-ink-muted">Zápasové sestavy ({matchLineups.length})</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {matchLineups.map((l) => (
              <LineupRow
                key={l.id}
                lineup={l}
                meta={`${matchName(l)} · ${fmt(l)?.name ?? '?'} · ${filled(l)}/8`}
                current={l.id === draft.lineupId}
                onOpen={() => l.matchId && act.editMatchLineup(l.matchId)}
                onPreview={() => setPreview(l)}
                onRename={() => setRenaming(l)}
                onDuplicate={() => act.duplicateLineup(l.id)}
                onDelete={() => setConfirm(l)}
              />
            ))}
          </ul>
        </details>
      )}

      {preview && fmt(preview) && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-ink/50" role="dialog" aria-modal="true" onClick={() => setPreview(null)}>
          <div className="safe-bottom rounded-t-2xl bg-paper p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-bold">{preview.name}</h2>
              <button type="button" onClick={() => setPreview(null)} className="tap rounded-lg px-3 text-ink-muted" aria-label="Zavřít">
                ✕
              </button>
            </div>
            <LineupPreview formation={fmt(preview)!} assignments={preview.assignments} missingSlotIds={[]} players={players} />
            <Btn
              kind="primary"
              className="mt-3 w-full"
              onClick={() => {
                if (preview.matchId) act.editMatchLineup(preview.matchId);
                else act.loadLineup(preview.id);
                setPreview(null);
                openEditor();
              }}
            >
              Otevřít v editoru
            </Btn>
          </div>
        </div>
      )}
      {confirm && (
        <Confirm
          title={`Smazat „${confirm.name}“?`}
          text={confirm.matchId ? 'Zápas přijde o startovní sestavu.' : 'Šablona zmizí. Zápasy, které ji používají jako startovní, o ni přijdou.'}
          confirmLabel="Smazat"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            act.deleteLineup(confirm.id);
            setConfirm(null);
          }}
        />
      )}
      {renaming && (
        <NamePrompt
          title="Přejmenovat sestavu"
          initial={renaming.name}
          onConfirm={(name) => {
            act.renameLineup(renaming.id, name);
            setRenaming(null);
          }}
          onClose={() => setRenaming(null)}
        />
      )}
    </div>
  );
}

function LineupRow({
  lineup,
  meta,
  current,
  onOpen,
  onPreview,
  onRename,
  onDuplicate,
  onDelete,
}: {
  lineup: Lineup;
  meta: string;
  current: boolean;
  onOpen: () => void;
  onPreview: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <li className={`rounded-xl border-2 bg-white p-2 ${current ? 'border-primary' : 'border-ink/10'}`}>
      <div className="flex gap-2">
        <button type="button" onClick={onOpen} className="tap flex min-w-0 flex-1 flex-col justify-center px-2 text-left">
          <span className="truncate text-lg font-bold">{lineup.name}</span>
          <span className="text-sm text-ink-muted">{meta}</span>
        </button>
        <button type="button" onClick={onPreview} className="tap rounded-lg border border-ink/10 px-3 text-sm font-semibold text-primary" aria-label={`Náhled ${lineup.name}`}>
          Náhled
        </button>
      </div>
      <div className="mt-1 flex gap-1 no-touch-fx">
        <Btn kind="ghost" className="flex-1 py-2 text-sm" onClick={onRename}>
          Přejmenovat
        </Btn>
        <Btn kind="ghost" className="flex-1 py-2 text-sm" onClick={onDuplicate}>
          Duplikovat
        </Btn>
        <Btn kind="ghost" className="flex-1 py-2 text-sm text-accent" onClick={onDelete}>
          Smazat
        </Btn>
      </div>
    </li>
  );
}
