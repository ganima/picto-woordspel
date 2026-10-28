import { describe, expect, it, vi } from 'vitest';

vi.mock('./offline', () => ({ getBlob: async () => null }));
vi.mock('./supabase', () => ({ mediaUrl: (p: string) => p }));
const { trimBounds } = await import('./audio');

describe('trimBounds', () => {
  const rate = 1000;

  it('cuts the silence around the word, keeping some padding', () => {
    const d = new Float32Array(3000);
    d.fill(0.5, 1000, 2000); // the word: 1.0 s to 2.0 s
    const b = trimBounds(d, rate);
    expect(b.from).toBeCloseTo(0.92); // 80 ms before
    expect(b.from + b.duration).toBeCloseTo(2.239); // 240 ms after the last loud sample
  });

  it('plays everything when it is (almost) all silence', () => {
    expect(trimBounds(new Float32Array(3000), rate)).toEqual({ from: 0, duration: 3 });
  });
});
