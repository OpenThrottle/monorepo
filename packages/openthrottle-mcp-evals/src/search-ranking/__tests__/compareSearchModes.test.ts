import { describe, expect, it } from 'vitest';

import {
  compareSearchModes,
  DEFAULT_COMPARE_OPTIONS,
} from '../compareSearchModes.ts';
import type { RankedChunk, SearchRankingCase } from '../eval-case.ts';
import type { SearchFn } from '../runSearchRanking.ts';
import { runSearchMode } from '../runSearchRanking.ts';

const HIT = '11111111-1111-4111-8111-111111111111';
const MISS = '22222222-2222-4222-8222-222222222222';

const chunk = (planId: string): RankedChunk => {
  return { planId, source: 'plan', sourcePath: null, taskId: null };
};

const CASES: readonly SearchRankingCase[] = [
  {
    id: 'identifier-case',
    kind: 'identifier',
    query: 'TS2835',
    relevant: [{ kind: 'plan', planId: HIT }],
    split: 'dev',
  },
  {
    id: 'topic-case',
    kind: 'topic',
    query: 'upgrade nx',
    relevant: [{ kind: 'plan', planId: HIT }],
    split: 'dev',
  },
];

/** Ranks HIT at `rank[mode][query]` (1-based), or not at all when absent. */
function fakeSearch(
  ranks: Record<string, Record<string, number>>,
  answeredMode: string | undefined,
): SearchFn {
  return (query, mode) => {
    const rank = ranks[mode]?.[query];
    const chunks = Array.from({ length: rank ?? 3 }, (_, index) => {
      return chunk(index + 1 === rank ? HIT : MISS);
    });

    return Promise.resolve({ chunks, mode: answeredMode ?? mode });
  };
}

describe('runSearchMode', () => {
  it('scores each case and records a mode the server did not honour', async () => {
    const run = await runSearchMode(
      CASES,
      'hybrid',
      fakeSearch({ hybrid: { TS2835: 1 } }, 'lexical'),
    );

    expect(run.scores.map((score) => score.reciprocalRank)).toEqual([1, 0]);
    expect(run.mismatchedModeCaseIds).toEqual([
      'identifier-case',
      'topic-case',
    ]);
  });
});

describe('compareSearchModes', () => {
  describe('when hybrid gains on identifiers and holds topics', () => {
    it('ships', async () => {
      const search = fakeSearch(
        {
          hybrid: { TS2835: 1, 'upgrade nx': 1 },
          semantic: { 'upgrade nx': 1 },
        },
        undefined,
      );
      const comparison = compareSearchModes(
        await runSearchMode(CASES, 'semantic', search),
        await runSearchMode(CASES, 'hybrid', search),
        DEFAULT_COMPARE_OPTIONS,
      );

      expect(comparison.ship).toBe(true);
      expect(comparison.identifierMrrGain).toBe(1);
      expect(comparison.rankDrops).toEqual([]);
    });
  });

  describe('when hybrid pushes a topic answer down', () => {
    it('holds and names the drop', async () => {
      const search = fakeSearch(
        {
          hybrid: { TS2835: 1, 'upgrade nx': 2 },
          semantic: { 'upgrade nx': 1 },
        },
        undefined,
      );
      const comparison = compareSearchModes(
        await runSearchMode(CASES, 'semantic', search),
        await runSearchMode(CASES, 'hybrid', search),
        DEFAULT_COMPARE_OPTIONS,
      );

      expect(comparison.ship).toBe(false);
      expect(comparison.why).toContain('topic MRR regressed by 0.500');
      expect(comparison.rankDrops).toEqual([
        { baselineRank: 1, candidateRank: 2, caseId: 'topic-case' },
      ]);
    });
  });

  describe('when the identifier gain is too small', () => {
    it('holds', async () => {
      const search = fakeSearch(
        { hybrid: { 'upgrade nx': 1 }, semantic: { 'upgrade nx': 1 } },
        undefined,
      );
      const comparison = compareSearchModes(
        await runSearchMode(CASES, 'semantic', search),
        await runSearchMode(CASES, 'hybrid', search),
        DEFAULT_COMPARE_OPTIONS,
      );

      expect(comparison.ship).toBe(false);
    });
  });

  describe('when the server fell back to another mode', () => {
    it('holds whatever the numbers say', async () => {
      const search = fakeSearch({ hybrid: { TS2835: 1 } }, 'lexical');
      const comparison = compareSearchModes(
        await runSearchMode(CASES, 'semantic', search),
        await runSearchMode(CASES, 'hybrid', search),
        DEFAULT_COMPARE_OPTIONS,
      );

      expect(comparison.ship).toBe(false);
      expect(comparison.why[0]).toMatch(/another mode/);
    });
  });
});
