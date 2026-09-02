/**
 * Optional cloud sync via Firebase Firestore. Phase 1: whole-team snapshots.
 *
 * - No user accounts: the club shares one long random "kód klubu"; every phone
 *   with the code reads/writes the same documents. Firebase anonymous auth is
 *   used only so the security rules can require a signed-in client.
 * - Documents: teams/{code}/squads/{A|B} = { json, updatedAt, device, team }.
 *   The app state is stored as a JSON string – Firestore rejects `undefined`
 *   and nested arrays, JSON.stringify sidesteps both.
 * - Firebase is loaded lazily (dynamic import) so the offline-first bundle stays
 *   small and no network request happens until the coach taps sync.
 * - Configuration: VITE_FIREBASE_CONFIG (JSON) at build time – on Netlify as an
 *   environment variable – or pasted in Settings (stored in localStorage).
 */
import type { AppData } from '../store';
import type { Team } from './team';

export type FirebaseConfig = {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

export type CloudSnapshotMeta = { updatedAt: number; device: string; team: Team; size: number };
export type CloudSnapshot = CloudSnapshotMeta & { data: AppData };

const CONFIG_KEY = 'junior-firebase';

export function parseFirebaseConfig(text: string): FirebaseConfig | null {
  // Accept the JS snippet from the Firebase console ("const firebaseConfig = {...};") or plain JSON.
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  let body = m[0]
    .replace(/\/\/.*$/gm, '')
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/'/g, '"')
    .replace(/,\s*}/g, '}');
  try {
    const obj = JSON.parse(body) as Record<string, unknown>;
    if (typeof obj.apiKey !== 'string' || typeof obj.projectId !== 'string') return null;
    return obj as FirebaseConfig;
  } catch {
    return null;
  }
}

export function getFirebaseConfig(): FirebaseConfig | null {
  const env = import.meta.env.VITE_FIREBASE_CONFIG as string | undefined;
  if (env) {
    const c = parseFirebaseConfig(env);
    if (c) return c;
  }
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? parseFirebaseConfig(raw) : null;
  } catch {
    return null;
  }
}

export function configSource(): 'env' | 'local' | null {
  if (import.meta.env.VITE_FIREBASE_CONFIG && parseFirebaseConfig(import.meta.env.VITE_FIREBASE_CONFIG as string)) return 'env';
  try {
    return localStorage.getItem(CONFIG_KEY) ? 'local' : null;
  } catch {
    return null;
  }
}

export function saveLocalFirebaseConfig(text: string): boolean {
  const c = parseFirebaseConfig(text);
  if (!c) return false;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
  return true;
}

export function clearLocalFirebaseConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
}

/** 24 base32-ish chars – unguessable, still typeable. */
export function generateClubCode(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function normalizeClubCode(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isValidClubCode(code: string): boolean {
  return /^[a-z0-9]{16,64}$/.test(code);
}

type Fire = {
  db: import('firebase/firestore').Firestore;
  doc: typeof import('firebase/firestore').doc;
  getDoc: typeof import('firebase/firestore').getDoc;
  setDoc: typeof import('firebase/firestore').setDoc;
};

let fire: Promise<Fire> | null = null;

async function init(): Promise<Fire> {
  if (fire) return fire;
  fire = (async () => {
    const config = getFirebaseConfig();
    if (!config) throw new Error('Firebase není nakonfigurovaný.');
    const [{ initializeApp, getApps }, { getAuth, signInAnonymously }, fs] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);
    const app = getApps()[0] ?? initializeApp(config);
    await signInAnonymously(getAuth(app));
    return { db: fs.getFirestore(app), doc: fs.doc, getDoc: fs.getDoc, setDoc: fs.setDoc };
  })();
  fire.catch(() => {
    fire = null; // allow retry after a failure (offline, wrong config)
  });
  return fire;
}

function squadRef(f: Fire, code: string, team: Team) {
  return f.doc(f.db, 'teams', code, 'squads', team);
}

export async function fetchMeta(code: string, team: Team): Promise<CloudSnapshotMeta | null> {
  const f = await init();
  const snap = await f.getDoc(squadRef(f, code, team));
  if (!snap.exists()) return null;
  const d = snap.data() as { updatedAt: number; device: string; team: Team; json: string };
  return { updatedAt: d.updatedAt, device: d.device, team: d.team, size: d.json?.length ?? 0 };
}

export async function download(code: string, team: Team): Promise<CloudSnapshot | null> {
  const f = await init();
  const snap = await f.getDoc(squadRef(f, code, team));
  if (!snap.exists()) return null;
  const d = snap.data() as { updatedAt: number; device: string; team: Team; json: string };
  return { updatedAt: d.updatedAt, device: d.device, team: d.team, size: d.json.length, data: JSON.parse(d.json) as AppData };
}

export async function upload(code: string, team: Team, data: AppData, device: string): Promise<CloudSnapshotMeta> {
  const f = await init();
  const json = JSON.stringify(data);
  if (json.length > 900_000) throw new Error('Data jsou větší než limit Firestore dokumentu (1 MB). Smaž staré zápasy.');
  const meta = { updatedAt: Date.now(), device, team };
  await f.setDoc(squadRef(f, code, team), { ...meta, json });
  return { ...meta, size: json.length };
}

export function describeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/permission|insufficient/i.test(msg)) return 'Firestore odmítl přístup – zkontroluj pravidla a zapnuté anonymní přihlášení.';
  if (/network|offline|unavailable|failed to fetch/i.test(msg)) return 'Bez připojení – zkus to znovu s internetem.';
  if (/api-key|invalid/i.test(msg)) return 'Neplatná konfigurace Firebase.';
  return msg;
}

export function defaultDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  return 'telefon';
}
