import { describe, expect, it } from 'vitest';
import nl from './nl';
import en from './en';

function keys(o: object, prefix = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v as object, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('strings', () => {
  it('have the same keys in Dutch and English', () => {
    expect(keys(en).sort()).toEqual(keys(nl).sort());
  });

  it('have no empty strings', () => {
    for (const lang of [nl, en]) {
      for (const k of keys(lang)) {
        const v = k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], lang);
        expect(v, k).toBeTruthy();
      }
    }
  });
});
