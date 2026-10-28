// Picto and shadow previews for the staff screens, by storage path. A picto that was just uploaded is
// seeded from the local file, so it does not need to be downloaded again.
import { reactive } from 'vue';
import { shadowFor } from '@/games/items';
import { fetchMedia } from './staff';

export interface Preview {
  pictoUrl: string;
  shadowUrl: string;
  sig: string;
  area: number;
}

export const previews = reactive<Record<string, Preview | 'error'>>({});
const started = new Set<string>();

async function analyse(path: string, url: string) {
  try {
    previews[path] = { pictoUrl: url, ...(await shadowFor(path, url)) };
  } catch (e) {
    console.warn('Preview failed', path, e);
    previews[path] = 'error';
  }
}

export function seedPreview(path: string, png: Blob): void {
  started.add(path);
  void analyse(path, URL.createObjectURL(png));
}

export function loadPreview(path: string): void {
  if (started.has(path)) return;
  started.add(path);
  fetchMedia(path)
    .then((blob) => analyse(path, URL.createObjectURL(blob)))
    .catch((e) => {
      console.warn('Could not load picto', path, e);
      previews[path] = 'error';
      started.delete(path);
    });
}
