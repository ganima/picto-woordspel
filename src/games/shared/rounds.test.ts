import { describe, expect, it } from 'vitest';
import { choicesFor, notExcluded, pickTargets, shuffle } from './rounds';
import { columnsFor, deal, pairsFor } from '../same/memory';

/** Deterministic pseudo-random numbers (mulberry32). */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const items = 'abcdefgh'.split('').map((id) => ({ id, options: {} as { exclude?: string[] } }));

describe('rounds', () => {
  it('shuffles without losing or duplicating anything', () => {
    expect(shuffle(items, seeded(1)).map((i) => i.id).sort()).toEqual(items.map((i) => i.id));
  });

  it('picks at most `rounds` different targets', () => {
    const t = pickTargets(items, 6, seeded(2));
    expect(t).toHaveLength(6);
    expect(new Set(t).size).toBe(6);
    expect(pickTargets(items.slice(0, 3), 6)).toHaveLength(3);
  });

  it('offers the target among n different choices', () => {
    for (let s = 0; s < 20; s++) {
      const c = choicesFor(items[0]!, items, 4, seeded(s));
      expect(c).toHaveLength(4);
      expect(c).toContain(items[0]);
      expect(new Set(c).size).toBe(4);
    }
  });

  it('avoids look-alikes while there are enough other options', () => {
    const alike = (a: { id: string }, b: { id: string }) => (a.id === 'b') !== (b.id === 'b') && [a.id, b.id].includes('a');
    for (let s = 0; s < 20; s++) expect(choicesFor(items[0]!, items, 3, seeded(s), alike)).not.toContainEqual(items[1]);
    // Only a and b exist: b is offered anyway rather than leaving a single choice.
    expect(choicesFor(items[0]!, items.slice(0, 2), 2, seeded(1), alike)).toHaveLength(2);
  });

  it('leaves out items excluded from a game', () => {
    const list = [{ id: 'x', options: { exclude: ['shadow'] } }, { id: 'y', options: {} }];
    expect(notExcluded(list, 'shadow').map((i) => i.id)).toEqual(['y']);
    expect(notExcluded(list, 'listen')).toHaveLength(2);
  });
});

describe('memory', () => {
  it('maps the choices setting to pairs', () => {
    expect([2, 3, 4].map(pairsFor)).toEqual([3, 4, 6]);
  });

  it('deals each picked item exactly twice', () => {
    const cards = deal(items, 4, seeded(3));
    expect(cards).toHaveLength(8);
    const counts = new Map<string, number>();
    cards.forEach((c) => counts.set(c.item.id, (counts.get(c.item.id) ?? 0) + 1));
    expect([...counts.values()]).toEqual([2, 2, 2, 2]);
  });

  it('lays out cards in sensible columns', () => {
    expect(columnsFor(6, true)).toBe(3);
    expect(columnsFor(12, true)).toBe(4);
    expect(columnsFor(12, false)).toBe(3);
  });
});
