// What the juf and admin change, written straight to Supabase. Every write goes through `job`, which drives
// the save indicator in the staff header.

import { reactive } from 'vue';
import { MEDIA_BUCKET, mediaUrl, supabase } from './supabase';
import { paths } from './staffLogic';
import type { GameRow, ThemeItemRow, ThemeRow } from './types';

export const saving = reactive({ busy: 0, error: false });

export async function job<T>(fn: () => Promise<T>): Promise<T> {
  saving.busy++;
  saving.error = false;
  try {
    return await fn();
  } catch (e) {
    saving.error = true;
    console.warn(e);
    throw e;
  } finally {
    saving.busy--;
  }
}

function ok<T>(r: { data: T; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data;
}

const media = () => supabase.storage.from(MEDIA_BUCKET);

async function upload(path: string, blob: Blob, contentType: string) {
  ok(await media().upload(path, blob, { contentType, cacheControl: '31536000', upsert: false }));
}

/** Remove files; a failure only leaves an orphan file behind, so it is logged, not thrown. */
async function removeFiles(list: (string | null | undefined)[]) {
  const files = list.filter((p): p is string => !!p);
  if (!files.length) return;
  const { error } = await media().remove(files);
  if (error) console.warn('Could not remove', files, error);
}

// ---- themes ----

export const listThemes = () =>
  job(async () => ok(await supabase.from('themes').select('*').order('sort').order('created_at')) as ThemeRow[]);

export const getTheme = (id: string) =>
  job(async () => ok(await supabase.from('themes').select('*').eq('id', id).maybeSingle()) as ThemeRow | null);

export const createTheme = (name: string, sort: number) =>
  job(async () => ok(await supabase.from('themes').insert({ name, sort }).select().single()) as ThemeRow);

export const updateTheme = (id: string, patch: Partial<Pick<ThemeRow, 'name' | 'visible' | 'sort'>>) =>
  job(async () => {
    ok(await supabase.from('themes').update(patch).eq('id', id));
  });

/** Delete a theme with its items (cascade) and all its files. */
export const deleteTheme = (id: string) =>
  job(async () => {
    const files = ok(await media().list(`themes/${id}`, { limit: 1000 }));
    ok(await supabase.from('themes').delete().eq('id', id));
    await removeFiles((files ?? []).map((f) => `themes/${id}/${f.name}`));
  });

export const countItems = () =>
  job(async () => {
    const rows = ok(await supabase.from('theme_items').select('theme_id')) as { theme_id: string }[];
    const out: Record<string, number> = {};
    for (const r of rows) out[r.theme_id] = (out[r.theme_id] ?? 0) + 1;
    return out;
  });

// ---- items ----

export const listItems = (themeId: string) =>
  job(
    async () =>
      ok(await supabase.from('theme_items').select('*').eq('theme_id', themeId).order('sort').order('created_at')) as ThemeItemRow[],
  );

/** Store a standardised picto PNG and its row. */
export const addItem = (themeId: string, word: string, png: Blob, sort: number) =>
  job(async () => {
    const id = crypto.randomUUID();
    const picto_path = paths.picto(themeId, id);
    await upload(picto_path, png, 'image/png');
    try {
      return ok(
        await supabase.from('theme_items').insert({ id, theme_id: themeId, word, picto_path, sort }).select().single(),
      ) as ThemeItemRow;
    } catch (e) {
      await removeFiles([picto_path]);
      throw e;
    }
  });

export const updateItem = (id: string, patch: Partial<Pick<ThemeItemRow, 'word' | 'sort' | 'options'>>) =>
  job(async () => {
    ok(await supabase.from('theme_items').update(patch).eq('id', id));
  });

export const deleteItem = (item: ThemeItemRow) =>
  job(async () => {
    ok(await supabase.from('theme_items').delete().eq('id', item.id));
    await removeFiles([item.picto_path, item.audio_path]);
  });

/** Store a recording under a new name, point the item at it, then drop the old file. Returns the new path. */
export const setRecording = (item: ThemeItemRow, blob: Blob) =>
  job(async () => {
    const type = (blob.type || 'audio/webm').split(';')[0]!;
    const path = paths.audio(item.theme_id, item.id, type);
    await upload(path, blob, type);
    ok(await supabase.from('theme_items').update({ audio_path: path }).eq('id', item.id));
    await removeFiles([item.audio_path]);
    return path;
  });

export const clearRecording = (item: ThemeItemRow) =>
  job(async () => {
    ok(await supabase.from('theme_items').update({ audio_path: null }).eq('id', item.id));
    await removeFiles([item.audio_path]);
  });

/** A picto or recording from storage, for previews in the staff screens. */
export async function fetchMedia(path: string): Promise<Blob> {
  const res = await fetch(mediaUrl(path));
  if (!res.ok) throw new Error(`${res.status} for ${path}`);
  return res.blob();
}

// ---- games ----

export const listGames = () => job(async () => ok(await supabase.from('games').select('*').order('sort')) as GameRow[]);

export const setGameVisible = (key: string, visible: boolean) =>
  job(async () => {
    ok(await supabase.from('games').update({ visible }).eq('key', key));
  });
