import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ThemeItemRow } from './types';

const rows = { themes: [] as unknown[], items: [] as unknown[], games: [] as unknown[] };

// A chainable stand-in for the Supabase query builder that resolves to the rows of the requested table.
vi.mock('./supabase', () => {
  const query = (table: keyof typeof rows) => {
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'in', 'order']) q[m] = () => q;
    q.then = (ok: (v: unknown) => unknown) => ok({ data: rows[table], error: null });
    return q;
  };
  return {
    supabase: { from: (t: string) => query(t === 'theme_items' ? 'items' : (t as keyof typeof rows)) },
    mediaUrl: (p: string) => `https://media.test/${p}`,
  };
});

const item = (id: string, theme: string, audio: string | null = null): ThemeItemRow => ({
  id, theme_id: theme, word: id, picto_path: `themes/${theme}/${id}.png`, audio_path: audio, options: {}, sort: 0, created_at: '',
});

describe('planSync', async () => {
  const { planSync } = await import('./offline');

  it('downloads only what is missing and drops what is no longer used', () => {
    const plan = planSync({ items: [item('a', 't', 'themes/t/a-1.webm'), item('b', 't')] }, ['themes/t/a.png', 'themes/t/old.png']);
    expect(plan.missing.sort()).toEqual(['themes/t/a-1.webm', 'themes/t/b.png']);
    expect(plan.stale).toEqual(['themes/t/old.png']);
  });
});

describe('refresh', () => {
  beforeEach(() => {
    vi.resetModules();
    globalThis.indexedDB = new IDBFactory();
    URL.createObjectURL = vi.fn((b: Blob) => `blob:${(b as Blob & { tag?: string }).tag ?? 'x'}`);
    URL.revokeObjectURL = vi.fn();
  });

  it('caches the rows and pictos, and only downloads new files the second time', async () => {
    const fetchMock = vi.fn(async () => new Response('png'));
    vi.stubGlobal('fetch', fetchMock);
    rows.themes = [{ id: 't', name: 'Herfst', visible: true, sort: 0 }];
    rows.items = [item('a', 't', 'themes/t/a-1.webm'), item('b', 't')];
    rows.games = [{ key: 'shadow', kind: 'theme', available: true, visible: true, sort: 1, settings: {} }];

    const off = await import('./offline');
    await off.refresh();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(off.themes.value).toHaveLength(1);
    expect(off.themes.value[0]!.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(await off.getBlob('themes/t/a-1.webm')).not.toBeNull();

    // The juf re-records "a": one new file, the old recording is removed.
    rows.items = [item('a', 't', 'themes/t/a-2.webm'), item('b', 't')];
    fetchMock.mockClear();
    await off.refresh();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await off.getBlob('themes/t/a-1.webm')).toBeNull();
  });

  it('keeps the cached copy when there is no connection', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('png')));
    rows.themes = [{ id: 't', name: 'Herfst', visible: true, sort: 0 }];
    rows.items = [item('a', 't')];
    let off = await import('./offline');
    await off.refresh();

    // New page load, offline: the snapshot comes back from IndexedDB.
    vi.resetModules();
    off = await import('./offline');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    rows.items = [];
    const realFrom = (await import('./supabase')).supabase.from;
    (await import('./supabase')).supabase.from = () => { throw new TypeError('offline'); };
    await off.startOffline();
    await off.refresh();
    (await import('./supabase')).supabase.from = realFrom;
    expect(off.offline.failed).toBe(true);
    expect(off.themes.value[0]!.items.map((i) => i.id)).toEqual(['a']);
  });
});
