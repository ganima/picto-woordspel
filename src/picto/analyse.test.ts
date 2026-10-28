import { describe, expect, it } from 'vitest';
import { analysePixels, estimatePaper, fitRect, iou, isSimilar, shadowFlag, shadowPixels, SIG_GRID, SIZE, whitenPaper, wordFromFileName } from './analyse';

/** w×h white RGBA image; paint(x, y) returns an [r,g,b,a] to draw there, or null to leave white. */
function image(w: number, h: number, paint: (x: number, y: number) => number[] | null) {
  const p = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = paint(x, y);
      if (c) p.set(c, (y * w + x) * 4);
    }
  return p;
}
const BLACK = [0, 0, 0, 255];

describe('analysePixels', () => {
  it('finds nothing in a white image', () => {
    const a = analysePixels(image(20, 20, () => null), 20, 20);
    expect(a.area).toBe(0);
    expect(a.sig).toBe('');
  });

  it('treats transparent pixels as background', () => {
    const a = analysePixels(image(10, 10, () => [0, 0, 0, 0]), 10, 10);
    expect(a.area).toBe(0);
  });

  it('keeps white inside an outline as part of the object', () => {
    // A 10×10 square outline from (5,5) to (14,14) on 20×20: border plus enclosed white = 100 pixels.
    const p = image(20, 20, (x, y) => (x >= 5 && x <= 14 && y >= 5 && y <= 14 && (x === 5 || x === 14 || y === 5 || y === 14) ? BLACK : null));
    const a = analysePixels(p, 20, 20);
    expect(a.area).toBeCloseTo(100 / 400);
    expect(a.sig).toHaveLength(SIG_GRID * SIG_GRID);
    expect(a.sig).not.toContain('0');
  });

  it('counts a non-white frame as covering everything', () => {
    const p = image(20, 20, (x, y) => (x === 0 || y === 0 || x === 19 || y === 19 ? BLACK : null));
    expect(analysePixels(p, 20, 20).area).toBe(1);
  });
});

describe('photographed paper', () => {
  const PAPER = [215, 203, 200, 255];
  // A 40×40 photo of grey-pink paper with a dark 10×10 square, placed on white with a 4 px margin, as fitOnWhite does.
  const photo = (object: number[]) =>
    image(48, 48, (x, y) => {
      if (x < 4 || y < 4 || x >= 44 || y >= 44) return null;
      return x >= 19 && x < 29 && y >= 19 && y < 29 ? object : PAPER;
    });

  it('finds the paper colour behind the white margin', () => {
    expect(estimatePaper(photo(BLACK), 48, 48)).toEqual([215, 203, 200]);
  });

  it('treats the paper as background, so only the object becomes the shadow', () => {
    expect(analysePixels(photo(BLACK), 48, 48).area).toBeCloseTo(100 / (48 * 48));
  });

  it('keeps a pale object that differs clearly from the paper', () => {
    expect(analysePixels(photo([250, 225, 160, 255]), 48, 48).area).toBeCloseTo(100 / (48 * 48));
  });

  it('whitens the paper and keeps the white margin white', () => {
    const p = photo(BLACK);
    whitenPaper(p, [215, 203, 200]);
    expect([...p.slice(0, 4)]).toEqual([255, 255, 255, 255]); // margin
    const o = (10 * 48 + 10) * 4; // paper
    expect([...p.slice(o, o + 3)]).toEqual([255, 255, 255]);
  });

  it('does not take a coloured background for paper', () => {
    // 1 px margin on 48 px, about the app's 8 px on 384 px.
    const yellow = image(48, 48, (x, y) => {
      if (x < 1 || y < 1 || x >= 47 || y >= 47) return null;
      return x >= 19 && x < 29 && y >= 19 && y < 29 ? BLACK : [250, 215, 30, 255];
    });
    expect(estimatePaper(yellow, 48, 48)).toBeNull();
    expect(shadowFlag(analysePixels(yellow, 48, 48).area)).toBe('background');
  });

  it('leaves clean white pictos and objects touching the edge to the near-white rule', () => {
    expect(estimatePaper(image(20, 20, () => null), 20, 20)).toBeNull();
    const colours = [BLACK, [200, 30, 30, 255], [40, 160, 60, 255], [240, 200, 40, 255], [60, 90, 200, 255]];
    const busy = image(20, 20, (x, y) => colours[(x * 7 + y * 13) % 5]!);
    expect(estimatePaper(busy, 20, 20)).toBeNull();
    // A clean picto: white background, dark outline of a round object. Its outline is not a straight edge.
    const disc = image(48, 48, (x, y) => (Math.abs(Math.hypot(x - 24, y - 24) - 14) < 1.5 ? BLACK : null));
    expect(estimatePaper(disc, 48, 48)).toBeNull();
  });
});

describe('shadowPixels', () => {
  it('paints the mask in the shadow colour on transparent', () => {
    const out = shadowPixels(new Uint8Array([1, 0]));
    expect([...out]).toEqual([43, 51, 64, 255, 0, 0, 0, 0]);
  });
});

describe('similarity', () => {
  it('compares signatures by intersection over union', () => {
    expect(iou('1100', '1100')).toBe(1);
    expect(iou('1100', '0110')).toBeCloseTo(1 / 3);
    expect(iou('', '1')).toBe(0);
    expect(isSimilar('1'.repeat(10), '1'.repeat(10))).toBe(true);
    expect(isSimilar('1'.repeat(10), '1'.repeat(9) + '0')).toBe(false); // exactly 0.9 is not "above"
  });
});

describe('shadowFlag', () => {
  it('flags almost empty and almost full shadows', () => {
    expect(shadowFlag(0.01)).toBe('empty');
    expect(shadowFlag(0.95)).toBe('background');
    expect(shadowFlag(0.4)).toBeNull();
  });
});

describe('fitRect', () => {
  it('fits inside the margin and keeps the aspect ratio', () => {
    expect(fitRect(100, 50)).toEqual({ x: 8, y: (SIZE - 184) / 2, w: 368, h: 184 });
    expect(fitRect(1000, 1000)).toEqual({ x: 8, y: 8, w: 368, h: 368 });
  });
});

describe('wordFromFileName', () => {
  it('turns file names into words', () => {
    expect(wordFromFileName('appel.png')).toBe('appel');
    expect(wordFromFileName('03_Rode-Appel.PNG')).toBe('rode appel');
    expect(wordFromFileName('paddenstoel.v2.jpg')).toBe('paddenstoel.v2');
  });
});
