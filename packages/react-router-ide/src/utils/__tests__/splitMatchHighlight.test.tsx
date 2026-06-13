import { describe, expect, test } from 'vitest';
import { splitMatchHighlight } from '../splitMatchHighlight';

describe('splitMatchHighlight', () => {
  test('splits at the reported 1-based column', () => {
    expect(
      splitMatchHighlight({
        column: 7,
        lineText: 'const searchText = 1;',
        matchText: 'search',
      }),
    ).toEqual({ mid: 'search', post: 'Text = 1;', pre: 'const ' });
  });

  test('falls back to first occurrence when the column does not line up', () => {
    expect(
      splitMatchHighlight({
        column: 999,
        lineText: 'a search here',
        matchText: 'search',
      }),
    ).toEqual({ mid: 'search', post: ' here', pre: 'a ' });
  });

  test('returns the whole line as pre when nothing matches', () => {
    expect(
      splitMatchHighlight({
        column: 1,
        lineText: 'no match here',
        matchText: 'zzz',
      }),
    ).toEqual({ mid: '', post: '', pre: 'no match here' });
  });

  test('treats an empty matchText as no match', () => {
    expect(
      splitMatchHighlight({ column: 1, lineText: 'abc', matchText: '' }),
    ).toEqual({ mid: '', post: '', pre: 'abc' });
  });
});
