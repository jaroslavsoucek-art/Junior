import { useRef, useState } from 'react';
import { ACTIVE_TEAM, pickData, useStore, type AppData } from '../store';
import { switchTeamAndReload, TEAMS } from '../lib/team';
import { Btn, Confirm, Modal } from '../components/Modal';
import { buildExport, exportFileName, parseImport, previewImport, type ImportPreview } from '../lib/exportImport';

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const replaceAll = useStore((s) => s.replaceAll);
  const resetToSeed = useStore((s) => s.resetToSeed);

  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ data: AppData; preview: ImportPreview; exportedAt: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function doExport() {
    const data = pickData(useStore.getState());
    const json = JSON.stringify(buildExport(data, new Date(), ACTIVE_TEAM), null, 2);
    const name = exportFileName(new Date(), ACTIVE_TEAM);
    const file = new File([json], name, { type: 'application/json' });
    // iOS standalone PWAs handle <a download> poorly; the share sheet (→ "Save to Files") is reliable.
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
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    if (parsed.team && parsed.team !== ACTIVE_TEAM) {
      setError(`Soubor je záloha týmu ${parsed.team}, aktivní je tým ${ACTIVE_TEAM}. Přepni tým a importuj tam.`);
      return;
    }
    setPending({ data: parsed.data, exportedAt: parsed.exportedAt, preview: previewImport(pickData(useStore.getState()), parsed.data) });
    if (fileRef.current) fileRef.current.value = '';
  }

  const num = (v: string, min: number, max: number) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
  };

  return (
    <div className="px-4 pb-6">
      <div className="flex items-center gap-2 py-3">
        <button type="button" onClick={onBack} className="tap rounded-xl px-2 text-xl" aria-label="Zpět na kádr">
          ←
        </button>
        <h1 className="text-2xl font-bold">Nastavení</h1>
      </div>

      <Section title="Tým">
        <p className="text-sm text-ink-muted">Každý tým má vlastní kádr, sestavy, zápasy i minuty. Přepnutí appku znovu načte.</p>
        <div className="flex gap-2 no-touch-fx">
          {TEAMS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => t !== ACTIVE_TEAM && switchTeamAndReload(t)}
              aria-pressed={t === ACTIVE_TEAM}
              className={`tap flex-1 rounded-xl border-2 text-lg font-bold ${t === ACTIVE_TEAM ? 'border-primary bg-primary text-white' : 'border-ink/20 bg-white'}`}
            >
              Tým {t}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Výchozí hodnoty pro nový zápas">
        <NumberField
          label="Délka půle (min)"
          value={settings.defaultHalfLengthMin}
          onChange={(v) => updateSettings({ defaultHalfLengthMin: num(v, 5, 60) })}
        />
        <NumberField
          label="Počet půlí"
          value={settings.defaultHalvesCount}
          onChange={(v) => updateSettings({ defaultHalvesCount: num(v, 1, 4) })}
        />
        <NumberField
          label="Interval rotace (min)"
          value={settings.defaultRotationIntervalMin}
          onChange={(v) => updateSettings({ defaultRotationIntervalMin: num(v, 1, 30) })}
        />
      </Section>

      <Section title="Záloha dat">
        <p className="text-sm text-ink-muted">
          Vše je jen v tomto telefonu. Export vytvoří soubor <code>junior-{ACTIVE_TEAM}-&lt;datum&gt;.json</code> s kádrem, sestavami, zápasy i formacemi týmu {ACTIVE_TEAM}.
        </p>
        <Btn onClick={doExport} kind="primary">
          Exportovat JSON
        </Btn>
        <Btn onClick={() => fileRef.current?.click()}>Importovat JSON…</Btn>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {error && <p className="rounded-lg bg-accent/10 px-3 py-2 font-semibold text-accent">{error}</p>}
      </Section>

      <Section title="Nebezpečná zóna">
        <Btn onClick={() => setConfirmWipe(true)} kind="danger">
          Smazat všechna data
        </Btn>
      </Section>

      {notice && (
        <div className="fixed inset-x-4 bottom-24 z-40 rounded-xl bg-ink px-4 py-3 text-center font-semibold text-white">
          {notice}
        </div>
      )}

      {pending && (
        <Modal title="Import přepíše všechna data" onClose={() => setPending(null)}>
          {pending.exportedAt && (
            <p className="mb-2 text-sm text-ink-muted">Soubor exportován {new Date(pending.exportedAt).toLocaleString('cs-CZ')}</p>
          )}
          <table className="mb-3 w-full text-base">
            <thead>
              <tr className="text-left text-sm text-ink-muted">
                <th className="py-1"></th>
                <th className="py-1 text-right">Teď</th>
                <th className="py-1 text-right">Po importu</th>
              </tr>
            </thead>
            <tbody>
              {pending.preview.counts.map((c) => (
                <tr key={c.label} className="border-t border-ink/10">
                  <td className="py-2">{c.label}</td>
                  <td className="py-2 text-right tabular-nums">{c.current}</td>
                  <td className={`py-2 text-right font-semibold tabular-nums ${c.current !== c.incoming ? 'text-accent' : ''}`}>
                    {c.incoming}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pending.preview.addedPlayers.length > 0 && (
            <p className="text-sm">
              <b>Přibudou:</b> {pending.preview.addedPlayers.join(', ')}
            </p>
          )}
          {pending.preview.removedPlayers.length > 0 && (
            <p className="text-sm text-accent">
              <b>Zmizí:</b> {pending.preview.removedPlayers.join(', ')}
            </p>
          )}
          <p className="my-3 text-sm text-ink-muted">Nejde o sloučení. Aktuální data budou nahrazena obsahem souboru.</p>
          <div className="flex gap-2">
            <Btn onClick={() => setPending(null)} className="flex-1">
              Zrušit
            </Btn>
            <Btn
              kind="danger"
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

function flash(set: (s: string | null) => void, msg: string) {
  set(msg);
  setTimeout(() => set(null), 2500);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white p-4">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="font-semibold">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tap w-24 rounded-xl border border-ink/20 bg-paper px-3 text-right text-lg tabular-nums"
      />
    </label>
  );
}
