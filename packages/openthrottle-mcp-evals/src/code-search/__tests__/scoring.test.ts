import { describe, expect, it } from 'vitest';

import type { CodeSearchCase } from '../eval-case.ts';
import { scoreCodeCase, summarizeCodeScores } from '../scoring.ts';

const evalCase: CodeSearchCase = {
  id: 'case',
  kind: 'body',
  origin: 'test',
  query: 'q',
  relevantPaths: ['a.ts', 'b.ts'],
};

const ranked = (...paths: string[]) => {
  return paths.map((path) => ({ path }));
};

describe('scoreCodeCase', () => {
  describe('when a relevant file is in the top 5', () => {
    it('reports its rank and the relevant share of the top 5', () => {
      const score = scoreCodeCase(
        evalCase,
        ranked('x.ts', 'a.ts', 'a.ts', 'y.ts'),
      );

      expect(score).toMatchObject({
        firstRelevantRank: 2,
        hitAtK: true,
        precisionAtK: 0.4,
        reciprocalRank: 0.5,
      });
    });
  });

  describe('when the first relevant file is below the top 5', () => {
    it('counts the rank but not a hit', () => {
      const score = scoreCodeCase(
        evalCase,
        ranked('1.ts', '2.ts', '3.ts', '4.ts', '5.ts', 'b.ts'),
      );

      expect(score).toMatchObject({
        firstRelevantRank: 6,
        hitAtK: false,
        precisionAtK: 0,
      });
    });
  });

  describe('when nothing relevant is returned', () => {
    it('scores zero', () => {
      expect(scoreCodeCase(evalCase, [])).toMatchObject({
        firstRelevantRank: null,
        hitAtK: false,
        reciprocalRank: 0,
      });
    });
  });
});

describe('summarizeCodeScores', () => {
  it('averages over the cases', () => {
    const hit = scoreCodeCase(evalCase, ranked('a.ts'));
    const miss = scoreCodeCase(evalCase, ranked('z.ts'));

    expect(summarizeCodeScores([hit, miss])).toEqual({
      cases: 2,
      hitAtK: 0.5,
      meanPrecisionAtK: 0.1,
      mrr: 0.5,
    });
  });

  it('summarizes an empty group to zeros', () => {
    expect(summarizeCodeScores([])).toEqual({
      cases: 0,
      hitAtK: 0,
      meanPrecisionAtK: 0,
      mrr: 0,
    });
  });
});
