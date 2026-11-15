import { describe, expect, it } from 'vitest';

import type { RankedChunk, SearchRankingCase } from '../eval-case.ts';
import { chunkMatchesTarget, scoreCase, summarizeScores } from '../scoring.ts';

const PLAN = '11111111-1111-4111-8111-111111111111';
const OTHER_PLAN = '22222222-2222-4222-8222-222222222222';
const TASK = '33333333-3333-4333-8333-333333333333';

const planChunk = (planId: string): RankedChunk => {
  return { planId, source: 'plan', sourcePath: null, taskId: null };
};
const taskChunk = (planId: string, taskId: string): RankedChunk => {
  return { planId, source: 'task', sourcePath: null, taskId };
};
const docChunk = (path: string): RankedChunk => {
  return {
    planId: null,
    source: 'documentation',
    sourcePath: path,
    taskId: null,
  };
};

describe('chunkMatchesTarget', () => {
  describe('a plan target', () => {
    it('matches the plan and its tasks, not another plan', () => {
      const target = { kind: 'plan', planId: PLAN } as const;

      expect(chunkMatchesTarget(planChunk(PLAN), target)).toBe(true);
      expect(chunkMatchesTarget(taskChunk(PLAN, TASK), target)).toBe(true);
      expect(chunkMatchesTarget(planChunk(OTHER_PLAN), target)).toBe(false);
    });
  });

  describe('a task target', () => {
    it('matches only that task', () => {
      const target = { kind: 'task', taskId: TASK } as const;

      expect(chunkMatchesTarget(taskChunk(OTHER_PLAN, TASK), target)).toBe(
        true,
      );
      expect(chunkMatchesTarget(planChunk(PLAN), target)).toBe(false);
    });
  });

  describe('a documentation target', () => {
    it('matches by path', () => {
      const target = { kind: 'documentation', path: 'a/b.md' } as const;

      expect(chunkMatchesTarget(docChunk('a/b.md'), target)).toBe(true);
      expect(chunkMatchesTarget(docChunk('a/c.md'), target)).toBe(false);
    });
  });
});

describe('scoreCase', () => {
  const evalCase: SearchRankingCase = {
    id: 'case',
    kind: 'identifier',
    query: 'q',
    relevant: [
      { kind: 'plan', planId: PLAN },
      { kind: 'task', taskId: TASK },
    ],
    split: 'dev',
  };

  it('scores the first relevant rank and the share of gold found', () => {
    const score = scoreCase(evalCase, [
      planChunk(OTHER_PLAN),
      planChunk(OTHER_PLAN),
      planChunk(PLAN),
    ]);

    expect(score).toEqual({
      caseId: 'case',
      firstRelevantRank: 3,
      hitAt10: true,
      kind: 'identifier',
      recallAt10: 0.5,
      reciprocalRank: 1 / 3,
    });
  });

  it('scores zero when nothing relevant is ranked', () => {
    const score = scoreCase(evalCase, [planChunk(OTHER_PLAN)]);

    expect(score.firstRelevantRank).toBeNull();
    expect(score.reciprocalRank).toBe(0);
    expect(score.hitAt10).toBe(false);
  });

  it('counts a hit past rank 10 for MRR but not for hit or recall', () => {
    const ranked = [
      ...Array.from({ length: 10 }, () => planChunk(OTHER_PLAN)),
      taskChunk(OTHER_PLAN, TASK),
    ];
    const score = scoreCase(evalCase, ranked);

    expect(score.firstRelevantRank).toBe(11);
    expect(score.hitAt10).toBe(false);
    expect(score.recallAt10).toBe(0);
  });
});

describe('summarizeScores', () => {
  const scores = [
    scoreCase(
      {
        id: 'a',
        kind: 'identifier',
        query: 'q',
        relevant: [{ kind: 'plan', planId: PLAN }],
        split: 'dev',
      },
      [planChunk(PLAN)],
    ),
    scoreCase(
      {
        id: 'b',
        kind: 'topic',
        query: 'q',
        relevant: [{ kind: 'plan', planId: PLAN }],
        split: 'dev',
      },
      [planChunk(OTHER_PLAN), planChunk(PLAN)],
    ),
  ];

  it('averages every case', () => {
    expect(summarizeScores(scores, undefined)).toEqual({
      cases: 2,
      hitAt10: 1,
      meanRecallAt10: 1,
      mrr: 0.75,
    });
  });

  it('restricts to one kind', () => {
    expect(summarizeScores(scores, 'topic').mrr).toBe(0.5);
  });

  it('summarizes an empty group to zeros', () => {
    expect(summarizeScores([], 'topic')).toEqual({
      cases: 0,
      hitAt10: 0,
      meanRecallAt10: 0,
      mrr: 0,
    });
  });
});
