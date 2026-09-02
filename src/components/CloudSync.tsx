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
          <p className="text-sm text-muted">
            Sdílení dat mezi telefony přes Firebase. Na Netlify stačí proměnná <code>VITE_FIREBASE_CONFIG</code>; jinak sem vlož konfiguraci z Firebase konzole.
          </p>
          <Btn onClick={() => setConfigOpen(true)}>Vložit konfiguraci Firebase…</Btn>
        </>
      ) : (
        <p className="text-xs text-muted">
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

      {/* 2. club code + actions (design: code field with Sdílet inside, Nahrát / Stáhnout row, last sync line) */}
      {source && (
        <>
          <p className="text-[13px] font-medium text-muted">Kód klubu sdílí data s kolegy. Poslední nahrání vyhrává, nic se neslučuje.</p>
          <div className="flex min-h-[52px] items-center gap-2 rounded-2xl border border-line-2 bg-surface-3 px-3.5">
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
              placeholder="vygeneruj nebo vlož kód od kolegy"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Kód klubu"
              className="min-w-0 flex-1 bg-transparent font-mono text-[14px] font-bold tracking-[0.06em] text-ink outline-none"
            />
            {!code ? (
              <button
                type="button"
                onClick={() => {
                  const c = generateClubCode();
                  setCodeInput(c);
                  updateSettings({ clubCode: c });
                }}
                className="tap min-h-10 rounded-xl bg-primary/10 px-3 text-[12px] font-bold text-heading"
              >
                Vygenerovat
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (navigator.share) await navigator.share({ title: 'Kód klubu Junior 2014', text: code });
                    else {
                      await navigator.clipboard.writeText(code);
                      onNotice('Kód zkopírován');
                    }
                  } catch {
                    /* cancelled */
                  }
                }}
                className="tap min-h-10 rounded-xl bg-primary/10 px-3 text-[12px] font-bold text-heading"
              >
                Sdílet
              </button>
            )}
          </div>
          {code && !isValidClubCode(code) && <p className="text-[13px] font-bold text-accent-text">Kód musí mít 16–64 znaků (písmena a číslice).</p>}
          {ready && (
            <>
              <div className="flex gap-2">
                <Btn kind="primary" className="min-h-[52px] flex-1 rounded-2xl" disabled={busy !== null} onClick={() => (cloudNewerThanMine ? setConfirmUp(true) : void doUpload())}>
                  {busy === 'up' ? 'Nahrávám…' : 'Nahrát do cloudu'}
                </Btn>
                <Btn className="min-h-[52px] flex-1 rounded-2xl" disabled={busy !== null} onClick={() => void startDownload()}>
                  {busy === 'down' ? 'Stahuji…' : 'Stáhnout'}
                </Btn>
              </div>
              {cloudNewerThanMine && <p className="text-[12px] font-bold text-accent-text">V cloudu je novější verze, než jsi naposledy stáhl. Nahráním bys ji přepsal.</p>}
              <p className="text-[11px] font-semibold text-faint">
                {busy === 'meta' ? 'Načítám stav cloudu…' : meta === 'none' ? 'V cloudu zatím nic.' : meta ? `Naposledy nahráno ${fmt(meta.updatedAt)} · ${meta.device}` : 'Stav cloudu neznámý.'}
                {settings.lastDownloadAt ? ` · tento telefon stáhl ${fmt(settings.lastDownloadAt)}` : ''}
                <button type="button" className="ml-2 underline" onClick={() => void refreshMeta()}>
                  obnovit
                </button>
              </p>
            </>
          )}
          <label className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-muted">Název tohoto telefonu</span>
            <input value={settings.deviceName ?? ''} placeholder={defaultDeviceName()} onChange={(e) => updateSettings({ deviceName: e.target.value })} className="tap w-40 rounded-xl border border-line-2 bg-surface px-3 text-[14px] text-ink" />
          </label>
        </>
      )}

      {error && <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm font-semibold text-accent-text">{error}</p>}

      {configOpen && (
        <Modal title="Konfigurace Firebase" onClose={() => setConfigOpen(false)}>
          <p className="mb-2 text-sm text-muted">
            Firebase konzole → Project settings → Your apps → Web app → zkopíruj blok <code>firebaseConfig</code> a vlož sem (JS i JSON tvar).
          </p>
          <textarea
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-line-2 bg-surface p-3 font-mono text-xs text-ink"
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
          <p className="mb-2 text-sm text-muted">
            Verze z {fmt(pendingDown.meta.updatedAt)} · {pendingDown.meta.device}. Nahradí vše v tomto telefonu pro tým {ACTIVE_TEAM}.
          </p>
          <table className="mb-3 w-full text-base">
            <tbody>
              {pendingDown.preview.counts.map((c) => (
                <tr key={c.label} className="border-t border-line">
                  <td className="py-2">{c.label}</td>
                  <td className="py-2 text-right tabular-nums">{c.current}</td>
                  <td className={`py-2 text-right font-semibold tabular-nums ${c.current !== c.incoming ? 'text-accent-text' : ''}`}>{c.incoming}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pendingDown.preview.removedPlayers.length > 0 && (
            <p className="text-sm text-accent-text">
              <b>Zmizí:</b> {pendingDown.preview.removedPlayers.join(', ')}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Btn className="flex-1" onClick={() => setPendingDown(null)}>
              Zrušit
            </Btn>
            <Btn kind="accent" className="flex-1" onClick={applyDownload}>
              Přepsat a stáhnout
            </Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
