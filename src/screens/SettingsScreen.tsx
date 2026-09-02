import { useRef, useState } from 'react';
import { ACTIVE_TEAM, pickData, useStore, type AppData } from '../store';
import { Btn, Card, Confirm, Modal } from '../components/Modal';
import { DetailHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { CloudSync } from '../components/CloudSync';
import { IconChevronRight, IconCloud } from '../components/icons';
import { buildExport, exportFileName, parseImport, previewImport, type ImportPreview } from '../lib/exportImport';
import { switchTeamAndReload, TEAMS } from '../lib/team';
import type { ThemePref } from '../hooks/useTheme';

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetToSeed = useStore((s) => s.resetToSeed);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dataOpen, setDataOpen] = useState(false);

  if (dataOpen) return <DataScreen onBack={() => setDataOpen(false)} notice={notice} setNotice={setNotice} />;

  return (
    <div className="px-[18px] pb-[100px] pt-5">
      <DetailHeader title="Nastavení" onBack={onBack} />

      <Card className="mb-3.5">
        <h2 className="eyebrow mb-1">Aktivní tým</h2>
        <p className="mb-3 text-[13px] font-medium text-muted">Každý tým má vlastní kádr, sestavy i minuty. Přepnutí appku znovu načte.</p>
        <Segmented gold size="lg" value={ACTIVE_TEAM} options={TEAMS.map((t) => ({ value: t, label: `Tým ${t}` }))} onChange={(t) => t !== ACTIVE_TEAM && switchTeamAndReload(t)} />
      </Card>

      <Card className="mb-3.5">
        <h2 className="eyebrow mb-3">Vzhled</h2>
        <Segmented<ThemePref> size="lg" value={settings.theme ?? 'light'} options={[{ value: 'light', label: 'Světlý' }, { value: 'dark', label: 'Tmavý' }, { value: 'system', label: 'Systém' }]} onChange={(theme) => updateSettings({ theme })} />
        <p className="mt-2.5 text-[12px] font-medium text-faint">Na slunci zůstává světlý režim čitelnější, tmavý je pro halu a večerní zápasy.</p>
      </Card>

      <button type="button" onClick={() => setDataOpen(true)} className="tap mb-3.5 flex min-h-[60px] w-full items-center justify-between rounded-[22px] border border-line bg-surface px-4 text-left">
        <span className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-heading">
            <IconCloud />
          </span>
          <span>
            <span className="block text-[16px] font-bold text-ink">Záloha a sdílení</span>
            <span className="block text-[12px] font-semibold text-muted">Export/import JSON · cloud mezi telefony{settings.clubCode ? ' · kód nastaven' : ''}</span>
          </span>
        </span>
        <IconChevronRight className="text-chev" />
      </button>

      <section className="rounded-[22px] border border-accent-line bg-accent-soft p-4">
        <h2 className="eyebrow mb-2.5 !text-accent-text">Nebezpečná zóna</h2>
        <Btn kind="accent" className="w-full rounded-[14px]" onClick={() => setConfirmWipe(true)}>
          Smazat všechna data
        </Btn>
      </section>

      {notice && <Toast text={notice} />}
      {confirmWipe && (
        <Confirm
          title="Smazat všechna data?"
          text={`Smaže hráče, sestavy i všechny zápasy s minutami týmu ${ACTIVE_TEAM}. Vrátí se výchozí kádr. Nejde vzít zpět – nejdřív si udělej export.`}
          confirmLabel="Smazat vše"
          danger
          onCancel={() => setConfirmWipe(false)}
          onConfirm={() => {
            resetToSeed();
            setConfirmWipe(false);
            flash(setNotice, 'Data smazána, kádr obnoven ze seedu');
          }}
        />
      )}
    </div>
  );
}

function DataScreen({ onBack, notice, setNotice }: { onBack: () => void; notice: string | null; setNotice: (s: string | null) => void }) {
  const replaceAll = useStore((s) => s.replaceAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ data: AppData; preview: ImportPreview; exportedAt: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function doExport() {
    const data = pickData(useStore.getState());
    const json = JSON.stringify(buildExport(data, new Date(), ACTIVE_TEAM), null, 2);
    const name = exportFileName(new Date(), ACTIVE_TEAM);
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    setError(null);
    const parsed = parseImport(await f.text());
    if (!parsed.ok) return setError(parsed.error);
    if (parsed.team && parsed.team !== ACTIVE_TEAM) return setError(`Soubor je záloha týmu ${parsed.team}, aktivní je tým ${ACTIVE_TEAM}. Přepni tým a importuj tam.`);
    setPending({ data: parsed.data, exportedAt: parsed.exportedAt, preview: previewImport(pickData(useStore.getState()), parsed.data) });
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="px-[18px] pb-[100px] pt-5">
      <DetailHeader title="Záloha a sdílení" subtitle={`tým ${ACTIVE_TEAM}`} onBack={onBack} />

      <Card className="mb-3.5 flex flex-col gap-3">
        <h2 className="eyebrow">Sdílení mezi telefony (cloud)</h2>
        <CloudSync onNotice={(m) => flash(setNotice, m)} />
      </Card>

      <Card className="mb-3.5 flex flex-col gap-3">
        <h2 className="eyebrow">Záloha souborem</h2>
        <p className="text-[13px] text-muted">
          Export vytvoří soubor <code className="text-[12px]">junior-{ACTIVE_TEAM}-&lt;datum&gt;.json</code> s kádrem, sestavami, zápasy i formacemi.
        </p>
        <Btn onClick={doExport} kind="primary">
          Exportovat JSON
        </Btn>
        <Btn onClick={() => fileRef.current?.click()}>Importovat JSON…</Btn>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        {error && <p className="rounded-xl bg-accent-soft px-3 py-2 text-[13px] font-bold text-accent-text">{error}</p>}
      </Card>

      {notice && <Toast text={notice} />}
      {pending && (
        <Modal title="Import přepíše všechna data" subtitle={pending.exportedAt ? `Soubor exportován ${new Date(pending.exportedAt).toLocaleString('cs-CZ')}` : undefined} onClose={() => setPending(null)}>
          <table className="mb-3 w-full text-[15px]">
            <thead>
              <tr className="text-left text-[12px] text-muted">
                <th className="py-1" />
                <th className="py-1 text-right">Teď</th>
                <th className="py-1 text-right">Po importu</th>
              </tr>
            </thead>
            <tbody>
              {pending.preview.counts.map((c) => (
                <tr key={c.label} className="border-t border-line">
                  <td className="py-2 text-ink">{c.label}</td>
                  <td className="tabular py-2 text-right text-ink">{c.current}</td>
                  <td className={`tabular py-2 text-right font-bold ${c.current !== c.incoming ? 'text-accent-text' : 'text-ink'}`}>{c.incoming}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pending.preview.addedPlayers.length > 0 && (
            <p className="text-[13px] text-ink">
              <b>Přibudou:</b> {pending.preview.addedPlayers.join(', ')}
            </p>
          )}
          {pending.preview.removedPlayers.length > 0 && (
            <p className="text-[13px] text-accent-text">
              <b>Zmizí:</b> {pending.preview.removedPlayers.join(', ')}
            </p>
          )}
          <p className="my-3 text-[13px] text-muted">Nejde o sloučení. Aktuální data budou nahrazena obsahem souboru.</p>
          <div className="flex gap-2">
            <Btn onClick={() => setPending(null)} className="flex-1">
              Zrušit
            </Btn>
            <Btn
              kind="accent"
              className="flex-1"
              onClick={() => {
                replaceAll(pending.data);
                setPending(null);
                flash(setNotice, 'Import hotový');
              }}
            >
              Přepsat a importovat
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function flash(set: (s: string | null) => void, msg: string) {
  set(msg);
  setTimeout(() => set(null), 2500);
}

function Toast({ text }: { text: string }) {
  return <div className="fixed inset-x-4 bottom-[92px] z-40 rounded-[18px] bg-[#141728] px-4 py-3 text-center text-[14px] font-bold text-white shadow-float">{text}</div>;
}
