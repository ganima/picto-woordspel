import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings } from './settings';

describe('parseSettings', () => {
  it('returns defaults for nothing or garbage', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{not json')).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values and drops invalid ones', () => {
    const raw = JSON.stringify({ lang: 'en', choices: 7, showWords: false, ding: 'yes' });
    expect(parseSettings(raw)).toEqual({ ...DEFAULT_SETTINGS, lang: 'en', showWords: false });
  });
});
