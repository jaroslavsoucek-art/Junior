import { useEffect, useState } from 'react';
import { ACTIVE_TEAM, pickData, useStore, type AppData } from '../store';
import { Btn, Confirm, Modal } from './Modal';
import { previewImport, type ImportPreview } from '../lib/exportImport';
import {
  clearLocalFirebaseConfig,
  configSource,
  defaultDeviceName,
  describeError,
  download,
  fetchMeta,
  generateClubCode,
  isValidClubCode,
  normalizeClubCode,
  saveLocalFirebaseConfig,
  upload,
  type CloudSnapshotMeta,
} from '../lib/cloud';

/** Settings section: Firebase snapshot sync with a shared club code. */
export function CloudSync({ onNotice }: { onNotice: (msg: string) => void }) {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const replaceAll = useStore((s) => s.replaceAll);

  const [source, setSource] = useState(configSource());
  const [configOpen, setConfigOpen] = useState(false);
  const [configText, setConfigText] = useState('');
  const [codeInput, setCodeInput] = useState(settings.clubCode ?? '');
  const [busy, setBusy] = useState<'meta' | 'up' | 'down' | null>(null);
  const [meta, setMeta] = useState<CloudSnapshotMeta | null | 'none'>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmUp, setConfirmUp] = useState(false);
  const [pendingDown, setPendingDown] = useState<{ data: AppData; meta: CloudSnapshotMeta; preview: ImportPreview } | null>(null);

  const code = settings.clubCode ?? '';
  const ready = !!source && isValidClubCode(code);
  const device = settings.deviceName || defaultDeviceName();
  const fmt = (t?: number) => (t ? new Date(t).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

  async function refreshMeta() {
    if (!ready) return;
    setBusy('meta');
    setError(null);
    try {
      const m = await fetchMeta(code, ACTIVE_TEAM);
      setMeta(m ?? 'none');
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(null);
    }
  }
  useEffect(() => {
    void refreshMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, source]);

  async function doUpload() {
    setBusy('up');
    setError(null);
    try {
      const m = await upload(code, ACTIVE_TEAM, pickData(useStore.getState()), device);
      updateSettings({ lastUploadAt: m.updatedAt, lastDownloadAt: m.updatedAt });
      setMeta(m);
      onNotice(`Nahráno do cloudu (${Math.round(m.size / 1024)} kB)`);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(null);
      setConfirmUp(false);
    }
  }

  async function startDownload() {
    setBusy('down');
    setError(null);
    try {
      const snap = await download(code, ACTIVE_TEAM);
      if (!snap) {
        setMeta('none');
        setError('V cloudu pro tento tým a kód nic není. Nejdřív někdo musí nahrát.');
        return;
      }
      setPendingDown({ data: snap.data, meta: snap, preview: previewImport(pickData(useStore.getState()), snap.data) });
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(null);
    }
  }

  function applyDownload() {
    if (!pendingDown) return;
    const keep = useStore.getState().settings;
    // cloud settings win except for per-device fields
    replaceAll({
      ...pendingDown.data,
      settings: { ...pendingDown.data.settings, clubCode: keep.clubCode, deviceName: keep.deviceName, lastUploadAt: keep.lastUploadAt, lastDownloadAt: pendingDown.meta.updatedAt },
    });
    setMeta(pendingDown.meta);
    setPendingDown(null);
    onNotice(`Staženo z cloudu (${pendingDown.meta.device}, ${fmt(pendingDown.meta.updatedAt)})`);
  }

  const cloudNewerThanMine = meta && meta !== 'none' && (settings.lastDownloadAt ?? 0) < meta.updatedAt;

  return (
    <>
      {/* 1. configuration */}
      {!source ? (
        <>
          <p className="text-sm text-ink-muted">
            Sdílení dat mezi telefony přes Firebase. Na Netlify stačí proměnná <code>VITE_FIREBASE_CONFIG</code>; jinak sem vlož konfiguraci z Firebase konzole.
          </p>
          <Btn onClick={() => setConfigOpen(true)}>Vložit konfiguraci Firebase…</Btn>
        </>
      ) : (
        <p className="text-xs text-ink-muted">
          Firebase: nakonfigurováno {source === 'env' ? 'v buildu (Netlify)' : 'v tomto telefonu'}.
          {source === 'local' && (
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => {
                clearLocalFirebaseConfig();
                setSource(configSource());
                setMeta(null);
              }}
            >
              odebrat
            </button>
          )}
        </p>
      )}

      {/* 2. club code */}
      {source && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-ink-muted">Kód klubu (stejný na všech telefonech)</span>
            <div className="flex gap-2">
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                onBlur={() => {
                  const c = normalizeClubCode(codeInput);
                  setCodeInput(c);
                  if (c !== code) {
                    updateSettings({ clubCode: c, lastDownloadAt: undefined, lastUploadAt: undefined });
                    setMeta(null);
                  }
                }}
                placeholder="vygeneruj nebo vlož od kolegy"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="tap min-w-0 flex-1 rounded-xl border border-ink/20 bg-white px-3 font-mono text-base"
              />
              {!code && (
                <Btn
                  onClick={() => {
                    const c = generateClubCode();
                    setCodeInput(c);
                    updateSettings({ clubCode: c });
                  }}
                >
                  Vygenerovat
                </Btn>
              )}
              {code && (
                <Btn
                  onClick={async () => {
                    try {
                      if (navigator.share) await navigator.share({ title: 'Kód klubu Junior', text: code });
                      else {
                        await navigator.clipboard.writeText(code);
                        onNotice('Kód zkopírován');
                      }
                    } catch {
                      /* cancelled */
                    }
                  }}
                >
                  Sdílet
                </Btn>
              )}
            </div>
          </label>
          {code && !isValidClubCode(code) && <p className="text-sm font-semibold text-accent">Kód musí mít 16–64 znaků (písmena a číslice).</p>}
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink-muted">Název tohoto telefonu</span>
            <input
              value={settings.deviceName ?? ''}
              placeholder={defaultDeviceName()}
              onChange={(e) => updateSettings({ deviceName: e.target.value })}
              className="tap w-40 rounded-xl border border-ink/20 bg-white px-3 text-base"
            />
          </label>
        </div>
      )}

      {/* 3. status + actions */}
      {ready && (
        <div className="flex flex-col gap-2 rounded-xl bg-paper p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-muted">V cloudu (tým {ACTIVE_TEAM})</span>
            <span className="font-semibold tabular-nums">
              {busy === 'meta' ? 'načítám…' : meta === 'none' ? 'nic' : meta ? `${fmt(meta.updatedAt)} · ${meta.device}` : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Tento telefon stáhl</span>
            <span className="tabular-nums">{fmt(settings.lastDownloadAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Tento telefon nahrál</span>
            <span className="tabular-nums">{fmt(settings.lastUploadAt)}</span>
          </div>
          {cloudNewerThanMine && <p className="font-semibold text-accent">V cloudu je novější verze, než jsi naposledy stáhl. Nahráním bys ji přepsal.</p>}
          <div className="mt-1 flex gap-2">
            <Btn kind="primary" className="flex-1" disabled={busy !== null} onClick={() => (cloudNewerThanMine ? setConfirmUp(true) : void doUpload())}>
              {busy === 'up' ? 'Nahrávám…' : '⬆ Nahrát do cloudu'}
            </Btn>
            <Btn className="flex-1" disabled={busy !== null} onClick={() => void startDownload()}>
              {busy === 'down' ? 'Stahuji…' : '⬇ Stáhnout z cloudu'}
            </Btn>
          </div>
          <button type="button" className="tap self-end text-xs text-ink-muted underline" onClick={() => void refreshMeta()}>
            obnovit stav
          </button>
        </div>
      )}
      {error && <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm font-semibold text-accent">{error}</p>}

      {configOpen && (
        <Modal title="Konfigurace Firebase" onClose={() => setConfigOpen(false)}>
          <p className="mb-2 text-sm text-ink-muted">
            Firebase konzole → Project settings → Your apps → Web app → zkopíruj blok <code>firebaseConfig</code> a vlož sem (JS i JSON tvar).
          </p>
          <textarea
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-ink/20 bg-white p-3 font-mono text-xs"
            placeholder={'{\n  "apiKey": "…",\n  "projectId": "…",\n  …\n}'}
          />
          <div className="mt-3 flex gap-2">
            <Btn className="flex-1" onClick={() => setConfigOpen(false)}>
              Zrušit
            </Btn>
            <Btn
              kind="primary"
              className="flex-1"
              onClick={() => {
                if (saveLocalFirebaseConfig(configText)) {
                  setSource(configSource());
                  setConfigOpen(false);
                  setConfigText('');
                  onNotice('Firebase nakonfigurován');
                } else setError('Konfiguraci se nepodařilo přečíst – chybí apiKey nebo projectId.');
              }}
            >
              Uložit
            </Btn>
          </div>
        </Modal>
      )}
      {confirmUp && (
        <Confirm
          title="Přepsat novější verzi v cloudu?"
          text={`V cloudu je verze z ${meta && meta !== 'none' ? `${fmt(meta.updatedAt)} (${meta.device})` : ''}, kterou jsi ještě nestáhl. Nahráním ji nahradíš tím, co máš v telefonu.`}
          confirmLabel="Přepsat"
          danger
          onCancel={() => setConfirmUp(false)}
          onConfirm={() => void doUpload()}
        />
      )}
      {pendingDown && (
        <Modal title="Stáhnout z cloudu" onClose={() => setPendingDown(null)}>
          <p className="mb-2 text-sm text-ink-muted">
            Verze z {fmt(pendingDown.meta.updatedAt)} · {pendingDown.meta.device}. Nahradí vše v tomto telefonu pro tým {ACTIVE_TEAM}.
          </p>
          <table className="mb-3 w-full text-base">
            <tbody>
              {pendingDown.preview.counts.map((c) => (
                <tr key={c.label} className="border-t border-ink/10">
                  <td className="py-2">{c.label}</td>
                  <td className="py-2 text-right tabular-nums">{c.current}</td>
                  <td className={`py-2 text-right font-semibold tabular-nums ${c.current !== c.incoming ? 'text-accent' : ''}`}>{c.incoming}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pendingDown.preview.removedPlayers.length > 0 && (
            <p className="text-sm text-accent">
              <b>Zmizí:</b> {pendingDown.preview.removedPlayers.join(', ')}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Btn className="flex-1" onClick={() => setPendingDown(null)}>
              Zrušit
            </Btn>
            <Btn kind="danger" className="flex-1" onClick={applyDownload}>
              Přepsat a stáhnout
            </Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
