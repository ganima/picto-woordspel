// Browser-only wrappers around analyse.ts: draw, read pixels, encode.
import { analysePixels, estimatePaper, fitRect, shadowPixels, SIZE, whitenPaper, type Analysis } from './analyse';

function canvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  return c;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image ${src}`));
    img.src = src;
  });
}

/** The image on a white SIZE×SIZE canvas with the standard margin. */
export function fitOnWhite(src: CanvasImageSource & { width: number; height: number }): HTMLCanvasElement {
  const c = canvas();
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.fillStyle = '#fff';
  x.fillRect(0, 0, SIZE, SIZE);
  const iw = (src as HTMLImageElement).naturalWidth || src.width;
  const ih = (src as HTMLImageElement).naturalHeight || src.height;
  // Stored pictos are already standardised; fitting them again would add a second margin and shrink the shadow.
  const r = iw === SIZE && ih === SIZE ? { x: 0, y: 0, w: SIZE, h: SIZE } : fitRect(iw, ih);
  x.imageSmoothingQuality = 'high';
  x.drawImage(src, r.x, r.y, r.w, r.h);
  return c;
}

/**
 * The picto as it is stored (HANDOVER.md section 7): fitted on white, and for a photo or scan of paper, colour
 * corrected so the paper is white.
 */
export function standardise(src: CanvasImageSource & { width: number; height: number }): HTMLCanvasElement {
  const c = fitOnWhite(src);
  const x = c.getContext('2d', { willReadFrequently: true })!;
  const data = x.getImageData(0, 0, SIZE, SIZE);
  const paper = estimatePaper(data.data, SIZE, SIZE);
  if (paper) {
    whitenPaper(data.data, paper);
    x.putImageData(data, 0, 0);
  }
  return c;
}

export function toBlob(c: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), type));
}

export interface ShadowResult extends Omit<Analysis, 'mask'> {
  shadow: Blob;
}

/** Shadow PNG plus signature and area for a picto image. */
export async function makeShadow(img: HTMLImageElement): Promise<ShadowResult> {
  const fitted = fitOnWhite(img);
  const data = fitted.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, SIZE, SIZE);
  const { mask, area, sig } = analysePixels(data.data, SIZE, SIZE);
  const out = canvas();
  out.getContext('2d')!.putImageData(new ImageData(shadowPixels(mask), SIZE, SIZE), 0, 0);
  return { shadow: await toBlob(out), area, sig };
}
