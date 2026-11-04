import { describe, expect, it } from 'vitest';

import type { FuzzyMatchField } from '../fuzzy-match';
import {
  rankFilePaths,
  rankFuzzyMatches,
  scoreFuzzyMatch,
  splitFilePath,
} from '../fuzzy-match';

describe('scoreFuzzyMatch', () => {
  it('matches everything with score 0 for an empty query', () => {
    expect(scoreFuzzyMatch('  ', 'anything')).toBe(0);
  });

  it('returns null when the query is not a subsequence', () => {
    expect(scoreFuzzyMatch('xyz', 'composer')).toBeNull();
  });

  it('ranks exact > prefix > substring > subsequence', () => {
    const exact = scoreFuzzyMatch('chat', 'chat');
    const prefix = scoreFuzzyMatch('chat', 'chatbox');
    const substring = scoreFuzzyMatch('chat', 'mychat');
    const subsequence = scoreFuzzyMatch('chat', 'c-h-a-t');

    expect(exact).not.toBeNull();
    expect(prefix).not.toBeNull();
    expect(substring).not.toBeNull();
    expect(subsequence).not.toBeNull();
    expect(exact ?? 0).toBeGreaterThan(prefix ?? 0);
    expect(prefix ?? 0).toBeGreaterThan(substring ?? 0);
    expect(substring ?? 0).toBeGreaterThan(subsequence ?? 0);
  });

  it('is case-insensitive', () => {
    expect(scoreFuzzyMatch('HOME', 'useHomeComposer')).not.toBeNull();
  });

  it('rewards word-boundary subsequence hits over scattered ones', () => {
    const boundary = scoreFuzzyMatch('uhc', 'useHomeComposer') ?? 0;
    const scattered = scoreFuzzyMatch('uhc', 'puhxxxxxxxxc') ?? 0;

    expect(boundary).toBeGreaterThan(scattered);
  });

  describe('substring mode', () => {
    it('rejects a scattered subsequence', () => {
      expect(scoreFuzzyMatch('cmp', 'composer', 'substring')).toBeNull();
    });

    it('still accepts a contiguous hit', () => {
      expect(scoreFuzzyMatch('pose', 'composer', 'substring')).not.toBeNull();
    });
  });
});

describe('rankFuzzyMatches', () => {
  const fields = (text: string): readonly FuzzyMatchField[] => [
    { mode: 'fuzzy', text, weight: 1 },
  ];

  it('returns the input (limited) for an empty query', () => {
    expect(rankFuzzyMatches(['b', 'a', 'c'], '', fields, 2)).toEqual([
      'b',
      'a',
    ]);
  });

  it('drops non-matches and orders best first', () => {
    expect(
      rankFuzzyMatches(
        ['xcomposer', 'nope', 'composer', 'c-o-m-p'],
        'comp',
        fields,
      ),
    ).toEqual(['composer', 'xcomposer', 'c-o-m-p']);
  });

  it('keeps input order for equal scores', () => {
    expect(rankFuzzyMatches(['ab', 'ab'], 'ab', fields)).toHaveLength(2);
  });

  it('applies field weights', () => {
    const items = [
      { description: 'commit changes', slug: 'deploy' },
      { description: 'other', slug: 'github-commit' },
    ];
    const ranked = rankFuzzyMatches(items, 'commit', (item) => [
      { mode: 'fuzzy', text: item.slug, weight: 1 },
      { mode: 'substring', text: item.description, weight: 0.5 },
    ]);

    expect(ranked.map((item) => item.slug)).toEqual([
      'github-commit',
      'deploy',
    ]);
  });
});

describe('splitFilePath', () => {
  it('splits folder and file name', () => {
    expect(splitFilePath('src/app/main.ts')).toEqual({
      folder: 'src/app',
      name: 'main.ts',
    });
  });

  it('returns an empty folder for a root-level file', () => {
    expect(splitFilePath('README.md')).toEqual({
      folder: '',
      name: 'README.md',
    });
  });
});

describe('rankFilePaths', () => {
  it('ranks a file-name hit above a folder-only hit', () => {
    expect(
      rankFilePaths(
        ['composer/index.ts', 'src/hooks/useComposer.ts', 'src/other.ts'],
        'composer',
      ),
    ).toEqual(['src/hooks/useComposer.ts', 'composer/index.ts']);
  });

  it('prefers the shorter path among equal file-name matches', () => {
    expect(rankFilePaths(['a/b/c/app.ts', 'src/app.ts'], 'app.ts')).toEqual([
      'src/app.ts',
      'a/b/c/app.ts',
    ]);
  });

  it('matches fuzzily across the file name', () => {
    expect(rankFilePaths(['src/useHomeComposer.tsx'], 'uhc')).toEqual([
      'src/useHomeComposer.tsx',
    ]);
  });

  it('honours the limit', () => {
    expect(rankFilePaths(['a.ts', 'b.ts', 'c.ts'], '.ts', 2)).toHaveLength(2);
  });
});
