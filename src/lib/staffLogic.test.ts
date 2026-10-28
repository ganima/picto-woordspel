import { describe, expect, it } from 'vitest';
import { audioExt, matchSounds, move, nextSort, paths, setExcluded } from './staffLogic';

const rows = ['a', 'b', 'c', 'd'].map((id, sort) => ({ id, sort }));

describe('move', () => {
  it('moves an item and reports only the rows whose sort changed', () => {
    const r = move(rows, 3, 1);
    expect(r.list.map((i) => i.id)).toEqual(['a', 'd', 'b', 'c']);
    expect(r.changed).toEqual([{ id: 'd', sort: 1 }, { id: 'b', sort: 2 }, { id: 'c', sort: 3 }]);
  });

  it('ignores moves off the ends', () => {
    expect(move(rows, 0, -1).changed).toEqual([]);
    expect(move(rows, 3, 4).changed).toEqual([]);
  });

  it('renumbers rows that had gaps', () => {
    const gappy = [{ id: 'a', sort: 5 }, { id: 'b', sort: 9 }];
    expect(move(gappy, 1, 0).changed).toEqual([{ id: 'b', sort: 0 }, { id: 'a', sort: 1 }]);
  });
});

describe('helpers', () => {
  it('puts new things last', () => {
    expect(nextSort(rows)).toBe(4);
    expect(nextSort([])).toBe(0);
  });

  it('matches sound files to words by name', () => {
    const items = [{ word: 'Appel' }, { word: 'rode peer' }];
    const r = matchSounds([{ name: 'appel.m4a' }, { name: '02_rode-peer.mp3' }, { name: 'boom.webm' }], items);
    expect(r.matched.map((m) => m.item.word)).toEqual(['Appel', 'rode peer']);
    expect(r.unmatched.map((f) => f.name)).toEqual(['boom.webm']);
  });

  it('picks an extension per sound type', () => {
    expect(audioExt('audio/webm;codecs=opus')).toBe('webm');
    expect(audioExt('audio/mp4')).toBe('m4a');
    expect(audioExt('audio/x-m4a')).toBe('m4a');
    expect(audioExt('audio/mpeg')).toBe('mp3');
    expect(paths.audio('t', 'i', 'audio/mp4', 123)).toBe('themes/t/i-123.m4a');
  });

  it('adds and removes game exclusions', () => {
    expect(setExcluded({}, 'shadow', true)).toEqual({ exclude: ['shadow'] });
    expect(setExcluded({ exclude: ['shadow', 'same'] }, 'shadow', false)).toEqual({ exclude: ['same'] });
    expect(setExcluded({ exclude: ['shadow'] }, 'shadow', false)).toEqual({});
  });
});
