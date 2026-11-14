import { describe, expect, it } from 'vitest';

import type { CaseResult, RunResult } from '../compareBaseline.ts';
import { compareBaseline, passRate } from '../compareBaseline.ts';

const result = (id: string, passes: number, trials = 1): CaseResult => {
  return {
    failures: [],
    id,
    passes,
    trials,
  };
};

const run = (model: string, cases: readonly CaseResult[]): RunResult => {
  return {
    cases,
    effort: 'medium',
    model,
    surfaceSha256: 'abc',
    usage: {
      cacheReadInputTokens: 0,
      cacheWriteInputTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
    },
  };
};

describe('passRate', () => {
  it('divides passes by trials, and is 0 with no trials', () => {
    expect(passRate(result('a', 2, 4))).toBe(0.5);
    expect(passRate(result('a', 0, 0))).toBe(0);
  });
});

describe('compareBaseline', () => {
  describe('when the models differ', () => {
    it('refuses to compare', () => {
      expect(compareBaseline(run('m1', []), run('m2', []))).toEqual({
        baselineModel: 'm1',
        currentModel: 'm2',
        kind: 'model-mismatch',
      });
    });
  });

  describe('when the models match', () => {
    it('reports regressions, improvements, added and removed cases', () => {
      const baseline = run('m', [
        result('kept', 1),
        result('fixed', 0),
        result('gone', 1),
      ]);
      const current = run('m', [
        result('kept', 0),
        result('fixed', 1),
        result('new', 1),
      ]);

      expect(compareBaseline(baseline, current)).toEqual({
        added: ['new'],
        improvements: [{ baselineRate: 0, currentRate: 1, id: 'fixed' }],
        kind: 'compared',
        regressions: [{ baselineRate: 1, currentRate: 0, id: 'kept' }],
        removed: ['gone'],
      });
    });

    it('ignores drops within the tolerance', () => {
      const baseline = run('m', [result('a', 3, 3)]);
      const current = run('m', [result('a', 2, 3)]);
      const comparison = compareBaseline(baseline, current, 0.34);

      expect(comparison.kind === 'compared' && comparison.regressions).toEqual(
        [],
      );
    });
  });
});
