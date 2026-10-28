// Turn cached theme items into PlayItems. Shadows and signatures are made on the device (HANDOVER.md section 7)
// and remembered per picto path for as long as the page is open.

import { loadImage, makeShadow } from '@/picto/canvas';
import { pictoUrl } from '@/lib/offline';
import type { ThemeItemRow } from '@/lib/types';
import type { PlayItem } from './types';

interface ShadowInfo {
  shadowUrl: string;
  sig: string;
  area: number;
}

const shadows = new Map<string, Promise<ShadowInfo>>();

/** Shadow of the picto at `url`, remembered by its storage path. */
export function shadowFor(path: string, url: string): Promise<ShadowInfo> {
  let p = shadows.get(path);
  if (!p) {
    p = loadImage(url)
      .then(makeShadow)
      .then(({ shadow, sig, area }) => ({ shadowUrl: URL.createObjectURL(shadow), sig, area }));
    shadows.set(path, p);
    p.catch(() => shadows.delete(path));
  }
  return p;
}

/** Items whose picto is on this device, with their shadows. Items whose picto cannot be read are left out. */
export async function prepareItems(items: readonly ThemeItemRow[]): Promise<PlayItem[]> {
  const out = await Promise.all(
    items.map(async (i) => {
      const url = pictoUrl(i.picto_path);
      if (!url) return null;
      try {
        return { ...i, pictoUrl: url, ...(await shadowFor(i.picto_path, url)) };
      } catch (e) {
        console.warn('Could not analyse picto', i.picto_path, e);
        return null;
      }
    }),
  );
  return out.filter((i): i is PlayItem => i !== null);
}
