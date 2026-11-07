import { describe, expect, test } from 'vitest';

import {
  caseResultRank,
  describeCaseResult,
  describeMcNemar,
  describeRunConfig,
  formatDetectionFloor,
  formatEvalTimestamp,
  formatKappa,
  formatRate,
  formatRateInterval,
  shortId,
} from '~/routing/evals/utils/report-format';

describe('report-format', () => {
  test('formats rates, intervals, kappa and the detection floor', () => {
    expect(formatRate(0.666)).toBe('67%');
    expect(formatRate(null)).toBe('—');
    expect(formatRateInterval({ lower: 0.44, upper: 0.89 })).toBe('44%–89%');
    expect(formatRateInterval(null)).toBe('');
    expect(formatKappa(0.7234)).toBe('0.72');
    expect(formatKappa(undefined)).toBe('—');
    expect(formatDetectionFloor(0.283)).toBe('± 28 points');
    expect(formatDetectionFloor(null)).toBe('—');
  });

  test('describes McNemar with singular and plural cases', () => {
    expect(describeMcNemar({ b: 1, c: 0, pValue: 1 })).toBe(
      '1 case got worse, 0 got better, p = 1.00 — not significant at this size',
    );
    expect(describeMcNemar({ b: 12, c: 1, pValue: 0.0034 })).toBe(
      '12 cases got worse, 1 got better, p < 0.01 — significant at this size',
    );
  });

  test('names a run by driver, model and effort', () => {
    expect(
      describeRunConfig({ driver: 'claude', effort: 'high', model: 'opus' }),
    ).toBe('claude · opus · high');
    expect(
      describeRunConfig({ driver: 'codex', effort: null, model: null }),
    ).toBe('codex · default model');
  });

  test('formats timestamps deterministically and ids briefly', () => {
    expect(formatEvalTimestamp('2026-11-06T08:05:30.000Z')).toBe(
      '2026-11-06 08:05 UTC',
    );
    expect(formatEvalTimestamp(null)).toBe('not set');
    expect(formatEvalTimestamp('nonsense')).toBe('not set');
    expect(shortId('abcdef1234567890')).toBe('abcdef12');
    expect(shortId(null)).toBe('not set');
  });

  test('ranks failed cases before passed before not counted', () => {
    expect(caseResultRank(false)).toBeLessThan(caseResultRank(true));
    expect(caseResultRank(true)).toBeLessThan(caseResultRank(null));
    expect(describeCaseResult(null).color).toBe('slate');
    expect(describeCaseResult(false).color).toBe('red');
  });
});
