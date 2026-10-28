// Pure helpers for the staff screens, kept apart from Supabase so they can be unit tested.
import { wordFromFileName } from '@/picto/analyse';

export interface Sorted {
  id: string;
  sort: number;
}

/** Move the item at `from` to `to`; returns the new order and the rows whose sort value changed. */
export function move<T extends Sorted>(list: readonly T[], from: number, to: number): { list: T[]; changed: { id: string; sort: number }[] } {
  const next = list.slice();
  if (to < 0 || to >= next.length || from === to) return { list: next, changed: [] };
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  const changed: { id: string; sort: number }[] = [];
  const out = next.map((it, i) => {
    if (it.sort === i) return it;
    changed.push({ id: it.id, sort: i });
    return { ...it, sort: i };
  });
  return { list: out, changed };
}

/** Sort value for something added after `list`. */
export function nextSort(list: readonly Sorted[]): number {
  return list.reduce((m, i) => Math.max(m, i.sort + 1), 0);
}

const norm = (s: string) => s.trim().toLowerCase();

/** Pair sound files with items by name: appel.m4a goes with the word "appel". */
export function matchSounds<F extends { name: string }, I extends { word: string }>(files: readonly F[], items: readonly I[]) {
  const matched: { file: F; item: I }[] = [];
  const unmatched: F[] = [];
  for (const file of files) {
    const item = items.find((i) => norm(i.word) === wordFromFileName(file.name));
    if (item) matched.push({ file, item });
    else unmatched.push(file);
  }
  return { matched, unmatched };
}

/** File extension for a recorded or uploaded sound's MIME type. */
export function audioExt(mime: string): string {
  const t = mime.split(';')[0]!.trim().toLowerCase();
  if (/mp4|m4a|aac/.test(t)) return 'm4a';
  if (/ogg/.test(t)) return 'ogg';
  if (/wav/.test(t)) return 'wav';
  if (/mpeg|mp3/.test(t)) return 'mp3';
  return 'webm';
}

/** Storage paths (HANDOVER.md section 3). A new recording always gets a new name, so caches never go stale. */
export const paths = {
  picto: (themeId: string, itemId: string) => `themes/${themeId}/${itemId}.png`,
  audio: (themeId: string, itemId: string, mime: string, now = Date.now()) => `themes/${themeId}/${itemId}-${now}.${audioExt(mime)}`,
};

/** Toggle one game key in an item's exclude list. */
export function setExcluded(options: { exclude?: string[] }, game: string, excluded: boolean): { exclude?: string[] } {
  const set = new Set(options.exclude ?? []);
  if (excluded) set.add(game);
  else set.delete(game);
  const { exclude: _old, ...rest } = options;
  return set.size ? { ...rest, exclude: [...set].sort() } : rest;
}
