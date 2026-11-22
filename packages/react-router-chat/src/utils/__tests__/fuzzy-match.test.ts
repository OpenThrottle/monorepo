import { describe, expect, test } from 'vitest';

import {
  fuzzyScore,
  fuzzyScorePath,
  fuzzyScoreSkill,
  rankByFuzzyMatch,
} from '../fuzzy-match';

const rankPaths = (
  query: string,
  paths: readonly string[],
): readonly string[] => {
  return rankByFuzzyMatch(paths, query, fuzzyScorePath);
};

describe('fuzzyScore', () => {
  test('excludes non-matches', () => {
    expect(fuzzyScore('xyz', 'button')).toBeNull();
    expect(fuzzyScore('tub', 'button')).toBeNull();
  });

  test('is case-insensitive', () => {
    expect(fuzzyScore('BUT', 'button')).not.toBeNull();
    expect(fuzzyScore('but', 'BUTTON')).not.toBeNull();
  });

  test('treats an empty query as matching everything equally', () => {
    expect(fuzzyScore('  ', 'anything')).toBe(0);
  });

  test('orders tiers: exact > prefix > boundary > substring > subsequence', () => {
    const exact = fuzzyScore('app', 'app');
    const prefix = fuzzyScore('app', 'application');
    const boundary = fuzzyScore('app', 'my-app');
    const substring = fuzzyScore('app', 'wrapper');
    const subsequence = fuzzyScore('app', 'a-p-p');

    expect(exact).toBeGreaterThan(prefix ?? 0);
    expect(prefix).toBeGreaterThan(boundary ?? 0);
    expect(boundary).toBeGreaterThan(substring ?? 0);
    expect(substring).toBeGreaterThan(subsequence ?? 0);
    expect(subsequence).not.toBeNull();
  });

  test.each([
    ['after a dash', 'my-app'],
    ['after an underscore', 'my_app'],
    ['after a dot', 'my.app'],
    ['after a slash', 'my/app'],
    ['at a camelCase hump', 'myApp'],
  ])('recognises a word start %s', (_label, text) => {
    expect(fuzzyScore('app', text)).toBeGreaterThan(
      fuzzyScore('app', 'wrapper') ?? 0,
    );
  });

  test('finds a later word-start occurrence even if an earlier one is mid-word', () => {
    expect(fuzzyScore('app', 'wrapper-app')).toBeGreaterThan(
      fuzzyScore('app', 'wrapper') ?? 0,
    );
  });

  test('prefers the shorter candidate within a tier', () => {
    expect(fuzzyScore('app', 'apple')).toBeGreaterThan(
      fuzzyScore('app', 'applesauce') ?? 0,
    );
  });

  test('scores tighter subsequences above looser ones', () => {
    expect(fuzzyScore('abc', 'xaxbxc')).toBeGreaterThan(
      fuzzyScore('abc', 'xaxxxxxbxxxxxc') ?? 0,
    );
  });
});

describe('fuzzyScorePath', () => {
  test('ranks a basename match above a directory-only match', () => {
    expect(rankPaths('chat', ['chat/index.ts', 'src/Chat.tsx'])).toEqual([
      'src/Chat.tsx',
      'chat/index.ts',
    ]);
  });

  test('ranks a basename prefix above a basename substring', () => {
    expect(rankPaths('app', ['src/wrapper.ts', 'src/app.ts'])).toEqual([
      'src/app.ts',
      'src/wrapper.ts',
    ]);
  });

  test('ranks an exact basename first', () => {
    expect(rankPaths('app.ts', ['src/app.tsx', 'src/app.ts'])).toEqual([
      'src/app.ts',
      'src/app.tsx',
    ]);
  });

  test('breaks ties with the shorter path', () => {
    expect(rankPaths('util', ['a/b/c/util.ts', 'a/util.ts'])).toEqual([
      'a/util.ts',
      'a/b/c/util.ts',
    ]);
  });

  test('matches a query that spans directories', () => {
    expect(rankPaths('src/app', ['lib/app.ts', 'src/app.ts'])).toEqual([
      'src/app.ts',
    ]);
  });

  test('falls back to a scattered subsequence and excludes the rest', () => {
    expect(rankPaths('abt', ['src/about.ts', 'src/other.ts'])).toEqual([
      'src/about.ts',
    ]);
  });
});

describe('fuzzyScoreSkill', () => {
  const graphify = { description: 'Build a knowledge graph', slug: 'graphify' };
  const improve = { description: 'Audit with graph tools', slug: 'improve' };

  test('matches on the slug', () => {
    expect(fuzzyScoreSkill('impro', improve)).not.toBeNull();
  });

  test('ranks slug matches above description-only matches', () => {
    const ranked = rankByFuzzyMatch(
      [improve, graphify],
      'graph',
      fuzzyScoreSkill,
    );

    expect(ranked.map((skill) => skill.slug)).toEqual(['graphify', 'improve']);
  });

  test('does not match a description by scattered subsequence', () => {
    expect(fuzzyScoreSkill('bkg', graphify)).toBeNull();
  });

  test('matches a description by substring', () => {
    expect(fuzzyScoreSkill('knowledge', graphify)).not.toBeNull();
  });
});

describe('rankByFuzzyMatch', () => {
  test('returns the input unchanged for an empty query', () => {
    const items = ['b', 'a'];

    expect(rankByFuzzyMatch(items, '', fuzzyScore)).toBe(items);
  });

  test('is stable for equal scores', () => {
    const ranked = rankByFuzzyMatch(['bb', 'aa', 'cc'], 'x', () => 1);

    expect(ranked).toEqual(['bb', 'aa', 'cc']);
  });

  test('ranks a few thousand paths', () => {
    const paths = Array.from({ length: 5000 }, (_, index) => {
      return `packages/pkg-${index % 50}/src/components/Component${index}.tsx`;
    });
    const ranked = rankPaths('cmp1', paths);

    expect(ranked.length).toBeGreaterThan(0);
  });
});
