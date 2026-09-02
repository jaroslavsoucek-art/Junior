import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { ScreenHeader } from '../components/ScreenHeader';
import { Btn, Confirm, Modal } from '../components/Modal';
import { NamePrompt } from '../components/NamePrompt';
import { LineupPreview, LineupThumb } from '../components/LineupPreview';
import { IconArrowRight, IconChevronDown } from '../components/icons';
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
  const [showMatchLineups, setShowMatchLineups] = useState(false);

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
  const dateShort = (t: number) => {
    const d = new Date(t);
    return `${d.getDate()}. ${d.getMonth() + 1}.`;
  };

  return (
    <div className="px-[18px] pb-[100px] pt-5">
      <ScreenHeader
        title="Sestavy"
        subtitle="Šablony · tap otevře editor"
        showLogo={false}
        right={
          <Btn
            kind="primary"
            className="min-h-12 px-4"
            onClick={() => {
              act.clearDraft();
              if (draft.matchId) act.leaveMatchEditing();
              openEditor();
            }}
          >
            + Nová
          </Btn>
        }
      />

      {draftUnsaved && (
        <button type="button" onClick={openEditor} className="tap mb-3.5 flex min-h-[68px] w-full items-center gap-3 rounded-[20px] border border-dashed border-gold/70 bg-gold-soft px-4 py-3 text-left">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold text-[#141728]">
            <IconArrowRight />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-extrabold text-gold-text">Rozpracovaná, neuložená</span>
            <span className="block text-[12px] font-semibold text-gold-text opacity-80">
              {formations.find((f) => f.id === draft.formationId)?.name} · {draftFilled}/8 · pokračovat
            </span>
          </span>
        </button>
      )}

      {templates.length === 0 && !draftUnsaved && <p className="mt-6 text-center text-muted">Zatím žádná uložená sestava. Začni novou.</p>}

      <ul className="flex flex-col gap-2.5">
        {templates.map((l) => (
          <LineupRow
            key={l.id}
            lineup={l}
            thumb={fmt(l) ? <LineupThumb formation={fmt(l)!} assignments={l.assignments} /> : null}
            meta={`${fmt(l)?.name ?? '?'} · ${filled(l)}/8 · upraveno ${dateShort(l.updatedAt)}`}
            current={l.id === draft.lineupId && !draft.matchId}
            onOpen={() => {
              act.loadLineup(l.id);
              openEditor();
            }}
            onPreview={() => setPreview(l)}
            onDuplicate={() => act.duplicateLineup(l.id)}
            onDelete={() => setConfirm(l)}
          />
        ))}
      </ul>

      {matchLineups.length > 0 && (
        <div className="mt-3.5">
          <button type="button" onClick={() => setShowMatchLineups((v) => !v)} className="tap flex min-h-[52px] w-full items-center justify-between rounded-[18px] border border-line bg-surface px-4 text-left" aria-expanded={showMatchLineups}>
            <span className="text-[14px] font-bold text-ink">Zápasové sestavy</span>
            <span className="flex items-center gap-2 text-[12px] font-bold text-muted">
              {matchLineups.length} <IconChevronDown className={`text-chev transition-transform ${showMatchLineups ? 'rotate-180' : ''}`} />
            </span>
          </button>
          {showMatchLineups && (
            <ul className="mt-2.5 flex flex-col gap-2.5">
              {matchLineups.map((l) => (
                <LineupRow
                  key={l.id}
                  lineup={l}
                  thumb={fmt(l) ? <LineupThumb formation={fmt(l)!} assignments={l.assignments} /> : null}
                  meta={`${matchName(l)} · ${fmt(l)?.name ?? '?'} · ${filled(l)}/8`}
                  current={l.id === draft.lineupId}
                  onOpen={() => l.matchId && act.editMatchLineup(l.matchId)}
                  onPreview={() => setPreview(l)}
                  onDuplicate={() => act.duplicateLineup(l.id)}
                  onDelete={() => setConfirm(l)}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {preview && fmt(preview) && (
        <Modal title={preview.name} subtitle={`${fmt(preview)!.name} · ${filled(preview)}/8`} onClose={() => setPreview(null)}>
          <LineupPreview formation={fmt(preview)!} assignments={preview.assignments} missingSlotIds={[]} players={players} className="mx-auto w-full max-w-[240px]" />
          <div className="mt-3.5 flex gap-2">
            <Btn
              className="flex-1"
              onClick={() => {
                setRenaming(preview);
                setPreview(null);
              }}
            >
              Přejmenovat
            </Btn>
            <Btn
              kind="primary"
              className="flex-[1.4]"
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
        </Modal>
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

function LineupRow({ lineup, thumb, meta, current, onOpen, onPreview, onDuplicate, onDelete }: { lineup: Lineup; thumb: React.ReactNode; meta: string; current: boolean; onOpen: () => void; onPreview: () => void; onDuplicate: () => void; onDelete: () => void }) {
  return (
    <li className={`flex items-center gap-3 rounded-[20px] bg-surface px-3.5 py-3 ${current ? 'border-2 border-primary' : 'border border-line'}`}>
      <button type="button" onClick={onOpen} className="tap h-[66px] w-11 shrink-0 overflow-hidden rounded-[10px]" aria-label={`Otevřít ${lineup.name}`}>
        {thumb}
      </button>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onOpen} className="tap block w-full text-left">
          <p className="truncate text-[17px] font-bold text-ink">{lineup.name}</p>
          <p className="mt-0.5 text-[12px] font-semibold text-muted">{meta}</p>
        </button>
        <div className="no-touch-fx mt-1 flex gap-1.5">
          <button type="button" onClick={onPreview} className="tap min-h-10 rounded-xl border border-line-2 bg-surface px-3 text-[12px] font-bold text-ink">
            Náhled
          </button>
          <button type="button" onClick={onDuplicate} className="tap min-h-10 rounded-xl border border-line-2 bg-surface px-3 text-[12px] font-bold text-ink">
            Duplikovat
          </button>
          <button type="button" onClick={onDelete} className="tap min-h-10 rounded-xl border border-accent-line bg-accent-soft px-3 text-[12px] font-bold text-accent-text">
            Smazat
          </button>
        </div>
      </div>
    </li>
  );
}
