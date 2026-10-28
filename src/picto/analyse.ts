// Pure picto analysis (HANDOVER.md section 7), on raw RGBA pixels so it can be unit tested without a canvas.

export const SIZE = 384;
export const MARGIN = 8;
export const SHADE: readonly [number, number, number] = [43, 51, 64];
export const SIG_GRID = 24;
/** Two shadows with an IoU above this count as similar and are not offered together. */
export const SIMILAR = 0.9;
export const AREA_MIN = 0.03;
export const AREA_MAX = 0.9;
/** How far (RGB distance) a pixel may be from the estimated paper colour and still count as background. */
export const PAPER_TOLERANCE = 32;
/** Paper must be at least this light in every channel… */
export const PAPER_MIN_LIGHT = 140;
/** …and at most this far between its strongest and weakest channel (a slight tint from the light is fine). */
export const PAPER_MAX_TINT = 40;

export interface Analysis {
  /** 1 = object (part of the shadow), 0 = background reachable from the border. */
  mask: Uint8Array;
  /** Object pixels as a fraction of the whole image. */
  area: number;
  /** SIG_GRID² chars of '0'/'1' sampling the mask inside its bounding box; '' when there is no object. */
  sig: string;
}

export type ShadowFlag = 'empty' | 'background';

function isNearWhite(p: ArrayLike<number>, i: number): boolean {
  const o = i << 2;
  return p[o + 3]! < 24 || (p[o]! >= 226 && p[o + 1]! >= 226 && p[o + 2]! >= 226);
}

function isPureWhite(p: ArrayLike<number>, i: number): boolean {
  const o = i << 2;
  return p[o + 3]! < 24 || (p[o]! >= 250 && p[o + 1]! >= 250 && p[o + 2]! >= 250);
}

function median(v: number[]): number {
  const s = v.slice().sort((a, b) => a - b);
  return s[s.length >> 1]!;
}

/**
 * Colour of the paper around a photographed or scanned picto, or null for a clean digital picto.
 *
 * Walks in from each side past the white fitting margin. A photo ends in a straight edge, so along a side the
 * first non-white pixel sits at the same depth on (nearly) every line; an object's outline does not. Only sides
 * with such a straight edge are sampled, just inside it. When most samples agree on one colour that is not
 * near-white, that colour is the paper.
 */
export function estimatePaper(p: ArrayLike<number>, w: number, h: number): [number, number, number] | null {
  const STEP = 4, DEPTH = 4;
  const samples: [number, number, number][] = [];
  let straightSides = 0;
  /** One side: `starts` are the edge pixels of each line, `inward` the step towards the middle. */
  const side = (starts: number[], inward: number, len: number) => {
    const hits: { depth: number; i: number }[] = [];
    for (const start of starts) {
      let i = start, depth = 0;
      while (depth < len / 2 && isPureWhite(p, i)) {
        i += inward;
        depth++;
      }
      if (!isPureWhite(p, i)) hits.push({ depth, i });
    }
    if (hits.length < starts.length * 0.8) return;
    const edge = median(hits.map((h) => h.depth));
    const onEdge = hits.filter((h) => Math.abs(h.depth - edge) <= 1);
    if (onEdge.length < starts.length * 0.8) return;
    straightSides++;
    for (const h of onEdge) {
      const o = (h.i + inward * DEPTH) << 2;
      samples.push([p[o]!, p[o + 1]!, p[o + 2]!]);
    }
  };
  const xs = Array.from({ length: Math.ceil(w / STEP) }, (_, k) => k * STEP);
  const ys = Array.from({ length: Math.ceil(h / STEP) }, (_, k) => k * STEP);
  side(xs, w, h);
  side(xs.map((x) => (h - 1) * w + x), -w, h);
  side(ys.map((y) => y * w), 1, w);
  side(ys.map((y) => y * w + w - 1), -1, w);
  if (straightSides < 2) return null;

  const paper = [0, 1, 2].map((c) => median(samples.map((s) => s[c]!))) as [number, number, number];
  // Truly white already: nothing to correct. Lighter-than-near-white paper still counts, because its light is often uneven.
  if (paper.every((c) => c >= 250)) return null;
  // Paper is light and nearly grey. A coloured background (a yellow card, a blue frame) is not paper: correcting
  // it to white would wreck the picto's colours, so it is left alone and gets the "background is not white" warning.
  if (Math.min(...paper) < PAPER_MIN_LIGHT || Math.max(...paper) - Math.min(...paper) > PAPER_MAX_TINT) return null;
  const close = samples.filter((s) => distance(s, paper) < PAPER_TOLERANCE).length;
  return close >= samples.length * 0.6 ? paper : null;
}

/**
 * Scale each colour channel so the paper becomes white, in place. Used when storing an uploaded photo or scan:
 * the picto looks like a clean card, and slightly darker paper (uneven light) still falls under the near-white
 * rule afterwards.
 */
export function whitenPaper(p: Uint8ClampedArray, paper: readonly [number, number, number]): void {
  const gain = paper.map((c) => 255 / Math.max(c, 1));
  for (let o = 0; o < p.length; o += 4) {
    p[o] = p[o]! * gain[0]!;
    p[o + 1] = p[o + 1]! * gain[1]!;
    p[o + 2] = p[o + 2]! * gain[2]!;
  }
}

function distance(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
}

/**
 * Flood fill from every border pixel over background pixels: near-white, or close to the paper colour when the
 * picto is a photo or scan of paper. Whatever is not reached is the object, so white areas enclosed by an outline
 * stay part of the shadow.
 */
export function analysePixels(p: ArrayLike<number>, w: number, h: number): Analysis {
  const n = w * h;
  const bg = new Uint8Array(n);
  const stack = new Int32Array(n);
  const paper = estimatePaper(p, w, h);
  const px: number[] = [0, 0, 0];
  const isBackground = (i: number) => {
    if (isNearWhite(p, i)) return true;
    if (!paper) return false;
    const o = i << 2;
    px[0] = p[o]!;
    px[1] = p[o + 1]!;
    px[2] = p[o + 2]!;
    return distance(px, paper) < PAPER_TOLERANCE;
  };
  let sp = 0;
  const push = (i: number) => {
    if (!bg[i] && isBackground(i)) {
      bg[i] = 1;
      stack[sp++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (sp) {
    const i = stack[--sp]!;
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < n - w) push(i + w);
  }

  const mask = new Uint8Array(n);
  let count = 0;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let i = 0; i < n; i++) {
    if (bg[i]) continue;
    mask[i] = 1;
    count++;
    const x = i % w, y = (i / w) | 0;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }

  let sig = '';
  if (count) {
    for (let gy = 0; gy < SIG_GRID; gy++) {
      for (let gx = 0; gx < SIG_GRID; gx++) {
        const x = Math.min(w - 1, (x0 + ((gx + 0.5) / SIG_GRID) * (x1 - x0 + 1)) | 0);
        const y = Math.min(h - 1, (y0 + ((gy + 0.5) / SIG_GRID) * (y1 - y0 + 1)) | 0);
        sig += mask[y * w + x] ? '1' : '0';
      }
    }
  }
  return { mask, area: count / n, sig };
}

/** Solid shadow colour where the mask is set, transparent elsewhere. */
export function shadowPixels(mask: Uint8Array): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(mask.length * 4);
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const o = i << 2;
    out[o] = SHADE[0];
    out[o + 1] = SHADE[1];
    out[o + 2] = SHADE[2];
    out[o + 3] = 255;
  }
  return out;
}

/** Intersection over union of two signatures; 0 when either is missing or they differ in size. */
export function iou(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 0;
  let inter = 0, union = 0;
  for (let k = 0; k < a.length; k++) {
    const x = a[k] === '1', y = b[k] === '1';
    if (x && y) inter++;
    if (x || y) union++;
  }
  return union ? inter / union : 0;
}

export function isSimilar(a: string, b: string): boolean {
  return iou(a, b) > SIMILAR;
}

export function shadowFlag(area: number): ShadowFlag | null {
  if (area < AREA_MIN) return 'empty';
  if (area > AREA_MAX) return 'background';
  return null;
}

/** Placement of a w×h image on the SIZE square: scaled to fit inside the margin, centred, aspect kept. */
export function fitRect(w: number, h: number): { x: number; y: number; w: number; h: number } {
  const s = Math.min((SIZE - 2 * MARGIN) / w, (SIZE - 2 * MARGIN) / h);
  const dw = w * s, dh = h * s;
  return { x: (SIZE - dw) / 2, y: (SIZE - dh) / 2, w: dw, h: dh };
}

/** Word from an upload's file name: "03_rode-appel.png" becomes "rode appel". */
export function wordFromFileName(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/^\d+\s*/, '')
    .trim()
    .toLowerCase();
}
