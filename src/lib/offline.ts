// Offline-first class content (HANDOVER.md section 9). The rows of the visible themes and games are kept in
// IndexedDB together with every picto and recording they point to, so a tablet keeps working without wifi.
// A refresh downloads only paths this device does not have yet and removes files nothing points to any more.

import { computed, reactive } from 'vue';
import * as idb from './idb';
import { mediaUrl, supabase } from './supabase';
import type { GameRow, ThemeItemRow, ThemeRow } from './types';

export interface Snapshot {
  themes: ThemeRow[];
  items: ThemeItemRow[];
  games: GameRow[];
  savedAt: string;
}

const SNAPSHOT_KEY = 'snapshot.v1';
const PARALLEL_DOWNLOADS = 4;

interface OfflineState {
  snapshot: Snapshot | null;
  /** Object URLs of cached pictos, by media path. */
  urls: Record<string, string>;
  /** First load on a device that has nothing cached yet. */
  loading: boolean;
  /** Last refresh failed (usually: no connection). */
  failed: boolean;
  progress: { done: number; total: number };
}

export const offline = reactive<OfflineState>({
  snapshot: null,
  urls: {},
  loading: true,
  failed: false,
  progress: { done: 0, total: 0 },
});

/** Every media path a snapshot needs. */
export function neededPaths(s: Pick<Snapshot, 'items'>): Set<string> {
  const out = new Set<string>();
  for (const i of s.items) {
    out.add(i.picto_path);
    if (i.audio_path) out.add(i.audio_path);
  }
  return out;
}

/** What to download and what to throw away, given what is cached. */
export function planSync(next: Pick<Snapshot, 'items'>, cached: Iterable<string>) {
  const needed = neededPaths(next);
  const have = new Set(cached);
  return {
    missing: [...needed].filter((p) => !have.has(p)),
    stale: [...have].filter((p) => !needed.has(p)),
  };
}

function isPicto(path: string, s: Snapshot | null) {
  return !!s?.items.some((i) => i.picto_path === path);
}

function setUrl(path: string, blob: Blob) {
  if (offline.urls[path]) URL.revokeObjectURL(offline.urls[path]);
  offline.urls[path] = URL.createObjectURL(blob);
}

function dropUrl(path: string) {
  const u = offline.urls[path];
  if (u) URL.revokeObjectURL(u);
  delete offline.urls[path];
}

async function fetchRows(): Promise<Snapshot> {
  // Explicit filters: a staff member signed in on this device may read hidden rows too.
  const themes = await supabase.from('themes').select('*').eq('visible', true).order('sort').order('created_at');
  if (themes.error) throw themes.error;
  const games = await supabase.from('games').select('*').eq('available', true).eq('visible', true).order('sort');
  if (games.error) throw games.error;
  let items: ThemeItemRow[] = [];
  if (themes.data.length) {
    const r = await supabase
      .from('theme_items')
      .select('*')
      .in(
        'theme_id',
        themes.data.map((t) => t.id),
      )
      .order('sort')
      .order('created_at');
    if (r.error) throw r.error;
    items = r.data as ThemeItemRow[];
  }
  return { themes: themes.data as ThemeRow[], items, games: games.data as GameRow[], savedAt: new Date().toISOString() };
}

async function download(path: string): Promise<Blob> {
  const res = await fetch(mediaUrl(path));
  if (!res.ok) throw new Error(`${res.status} for ${path}`);
  return res.blob();
}

/** Run fn over items with at most `limit` at a time. Failures are collected, not thrown. */
async function pool<T>(items: T[], limit: number, fn: (t: T) => Promise<void>): Promise<number> {
  let next = 0, failed = 0;
  const worker = async () => {
    while (next < items.length) {
      const t = items[next++]!;
      try {
        await fn(t);
      } catch (e) {
        failed++;
        console.warn(e);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return failed;
}

let running: Promise<void> | null = null;

/** Bring the cache up to date. Concurrent calls share one run. */
export function refresh(): Promise<void> {
  if (!running) {
    running = (async () => {
      try {
        const next = await fetchRows();
        const { missing, stale } = planSync(next, await idb.keys(idb.BLOBS));
        offline.progress = { done: 0, total: missing.length };
        // Files that fail stay missing; the items that need them are hidden until a later refresh gets them.
        await pool(missing, PARALLEL_DOWNLOADS, async (path) => {
          const blob = await download(path);
          await idb.put(idb.BLOBS, path, blob);
          if (isPicto(path, next)) setUrl(path, blob);
          offline.progress.done++;
        });
        await idb.put(idb.KV, SNAPSHOT_KEY, next);
        await idb.del(idb.BLOBS, stale);
        stale.forEach(dropUrl);
        offline.snapshot = next;
        offline.failed = false;
      } catch (e) {
        console.warn('Refresh failed', e);
        offline.failed = true;
      } finally {
        offline.loading = false;
        running = null;
      }
    })();
  }
  return running;
}

/** Cached recording or picto, or null. */
export async function getBlob(path: string): Promise<Blob | null> {
  try {
    return (await idb.get<Blob>(idb.BLOBS, path)) ?? null;
  } catch {
    return null;
  }
}

let started = false;

/** Load the cached copy (instant, works offline), then refresh in the background and whenever the page comes back. */
export async function startOffline(): Promise<void> {
  if (started) return;
  started = true;
  try {
    const snap = await idb.get<Snapshot>(idb.KV, SNAPSHOT_KEY);
    if (snap) {
      offline.snapshot = snap;
      offline.loading = false;
      for (const i of snap.items) {
        const blob = await idb.get<Blob>(idb.BLOBS, i.picto_path);
        if (blob) setUrl(i.picto_path, blob);
      }
    }
  } catch (e) {
    console.warn('No offline cache available', e);
  }
  void refresh();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refresh();
  });
  window.addEventListener('online', () => void refresh());
}

// ---- views on the snapshot ----

export interface ThemeView {
  theme: ThemeRow;
  /** Items whose picto is on this device, in order. */
  items: ThemeItemRow[];
}

export const themes = computed<ThemeView[]>(() => {
  const s = offline.snapshot;
  if (!s) return [];
  return s.themes
    .map((theme) => ({ theme, items: s.items.filter((i) => i.theme_id === theme.id && offline.urls[i.picto_path]) }))
    .filter((t) => t.items.length > 0);
});

export function themeById(id: string): ThemeView | undefined {
  return themes.value.find((t) => t.theme.id === id);
}

export const games = computed<GameRow[]>(() => offline.snapshot?.games ?? []);

export function pictoUrl(path: string): string | undefined {
  return offline.urls[path];
}
