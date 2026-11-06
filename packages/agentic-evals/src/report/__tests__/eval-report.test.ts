import { describe, expect, it } from 'vitest';

import { buildEvalReport } from '../build-eval-report.ts';
import { compareEvalReports } from '../compare-eval-reports.ts';
import type {
  BuildEvalReportInput,
  ReportCalibration,
  ReportGrade,
  ReportTrial,
} from '../report-types.ts';

const code = (verdict: ReportGrade['verdict']): ReportGrade => {
  return {
    graderId: 'tests',
    graderKind: 'code',
    graderVersion: '1',
    judgeModel: null,
    judgeModelVersion: null,
    verdict,
  };
};

const judge = (
  graderId: string,
  verdict: ReportGrade['verdict'],
): ReportGrade => {
  return {
    graderId,
    graderKind: 'judge',
    graderVersion: '1',
    judgeModel: 'model',
    judgeModelVersion: null,
    verdict,
  };
};

const trial = (
  caseId: string,
  attempt: number,
  grades: readonly ReportGrade[],
  options: Partial<Pick<ReportTrial, 'costUsd' | 'status'>> = {},
): ReportTrial => {
  return {
    attempt,
    caseId,
    costUsd: options.costUsd === undefined ? 1 : options.costUsd,
    grades,
    status: options.status ?? 'completed',
  };
};

const calibrations: readonly ReportCalibration[] = [
  {
    graderId: 'judge-gating',
    graderVersion: '1',
    kappa: 0.7,
    kappaCiHigh: 0.9,
    kappaCiLow: 0.5,
    status: 'gating',
  },
  {
    graderId: 'judge-weak',
    graderVersion: '1',
    kappa: 0.3,
    kappaCiHigh: 0.5,
    kappaCiLow: 0.1,
    status: 'non_gating',
  },
];

// Hand-checked: k = 2 over cases A (dev), B (dev), C (test).
//   A: two passes                         -> case passes, 2/2
//   B: one pass, one failure              -> case fails, 1/2
//   C: a usage_limited attempt (left out) + a gating-judge failure -> case fails, 0/1
// Counted trials 5, passes 3, so the pass rate is 0.6; one trial excluded.
const input: BuildEvalReportInput = {
  calibrations,
  cases: [
    { caseId: 'A', split: 'dev' },
    { caseId: 'B', split: 'dev' },
    { caseId: 'C', split: 'test' },
  ],
  k: 2,
  trials: [
    trial('A', 1, [code('pass'), judge('judge-weak', 'fail')]),
    trial('A', 2, [code('pass')]),
    trial('B', 1, [code('pass')]),
    trial('B', 2, [code('fail')]),
    trial('C', 1, [code('pass')], { costUsd: 0.5, status: 'usage_limited' }),
    trial('C', 2, [code('pass'), judge('judge-gating', 'fail')]),
  ],
};

describe('buildEvalReport', () => {
  const report = buildEvalReport(input);

  it('rolls trials up into per-case rows', () => {
    expect(report.cases).toEqual([
      {
        attemptsCounted: 2,
        attemptsPassed: 2,
        caseId: 'A',
        passed: true,
        split: 'dev',
      },
      {
        attemptsCounted: 2,
        attemptsPassed: 1,
        caseId: 'B',
        passed: false,
        split: 'dev',
      },
      {
        attemptsCounted: 1,
        attemptsPassed: 0,
        caseId: 'C',
        passed: false,
        split: 'test',
      },
    ]);
  });

  it('counts trials and reports why trials were left out', () => {
    expect(report.numbers.trialsCounted).toBe(5);
    expect(report.numbers.trialsPassed).toBe(3);
    expect(report.numbers.trialsExcluded).toBe(1);
    expect(report.numbers.excluded).toEqual({
      errored: 0,
      grade_error: 0,
      no_counted_grade: 0,
      usage_limited: 1,
    });
  });

  it('computes the pass rate with a seeded interval', () => {
    const ci = report.numbers.passRateCi;

    expect(report.numbers.passRate).toBeCloseTo(0.6);
    expect(ci?.confidence).toBe(0.95);
    expect(ci?.lower).toBeLessThanOrEqual(0.6);
    expect(ci?.upper).toBeGreaterThanOrEqual(0.6);
    expect(buildEvalReport(input).numbers.passRateCi).toEqual(ci);
  });

  it('computes pass@k and pass^k over cases with k counted attempts', () => {
    expect(report.numbers.casesAtK).toBe(2);
    expect(report.numbers.passAtK).toBeCloseTo(1);
    expect(report.numbers.passHatK).toBeCloseTo(0.5);
  });

  it('computes the detection floor at the observed rate', () => {
    const expected = (1.959964 + 0.841621) * Math.sqrt((2 * 0.6 * 0.4) / 3);

    expect(report.numbers.casesCounted).toBe(3);
    expect(report.numbers.detectionFloor).toBeCloseTo(expected, 3);
  });

  it('prices only counted trials into cost per success, all trials into the total', () => {
    expect(report.numbers.costPerSuccessUsd).toBeCloseTo(5 / 3);
    expect(report.numbers.totalCostUsd).toBeCloseTo(5.5);
  });

  it('nulls both costs when a trial is unpriced', () => {
    const unpriced = buildEvalReport({
      ...input,
      trials: [
        ...input.trials,
        trial('A', 3, [code('pass')], { costUsd: null }),
      ],
    });

    expect(unpriced.numbers.costPerSuccessUsd).toBeNull();
    expect(unpriced.numbers.totalCostUsd).toBeNull();
  });

  it('lists graders with whether they count, and the weakest judge as the headline', () => {
    expect(report.graders.map((grader) => grader.graderId)).toEqual([
      'tests',
      'judge-gating',
      'judge-weak',
    ]);
    expect(
      report.graders.find((grader) => {
        return grader.graderId === 'judge-weak';
      })?.counts,
    ).toBe(false);
    expect(
      report.graders.find((grader) => {
        return grader.graderId === 'judge-gating';
      })?.counts,
    ).toBe(true);
    expect(report.numbers.judgeAgreement?.graderId).toBe('judge-weak');
    expect(report.numbers.judgeAgreement?.kappa).toBe(0.3);
  });

  it('reports nulls for a run with nothing counted', () => {
    const empty = buildEvalReport({
      calibrations: [],
      cases: input.cases,
      k: 3,
      trials: [],
    });

    expect(empty.numbers.passRate).toBeNull();
    expect(empty.numbers.passRateCi).toBeNull();
    expect(empty.numbers.detectionFloor).toBeNull();
    expect(empty.numbers.passHatK).toBeNull();
    expect(empty.numbers.judgeAgreement).toBeNull();
    expect(empty.cases.every((row) => row.passed === null)).toBe(true);
  });
});

describe('compareEvalReports', () => {
  const config = {
    authMode: 'api_key',
    datasetId: 'd1',
    datasetVersion: 1,
    k: 2,
  };
  const base = buildEvalReport(input);
  // Candidate: A now fails (regressed), B passes twice (improved), C unchanged.
  const candidate = buildEvalReport({
    ...input,
    trials: [
      trial('A', 1, [code('fail')]),
      trial('A', 2, [code('pass')]),
      trial('B', 1, [code('pass')]),
      trial('B', 2, [code('pass')]),
      trial('C', 1, [code('fail')]),
      trial('C', 2, [code('fail')]),
    ],
  });

  it('lists regressed and improved cases and runs McNemar on them', () => {
    const comparison = compareEvalReports({
      base: { config, report: base },
      candidate: { config, report: candidate },
    });

    expect(comparison.regressedCaseIds).toEqual(['A']);
    expect(comparison.improvedCaseIds).toEqual(['B']);
    expect(comparison.sharedCases).toBe(3);
    expect(comparison.mcnemar).toMatchObject({ b: 1, c: 1, pValue: 1 });
    expect(comparison.warnings).toEqual([]);
  });

  it('warns about different datasets, auth modes and k but still compares', () => {
    const comparison = compareEvalReports({
      base: { config, report: base },
      candidate: {
        config: {
          authMode: 'subscription',
          datasetId: 'd2',
          datasetVersion: 2,
          k: 3,
        },
        report: candidate,
      },
    });

    expect(
      comparison.warnings.map((warning) => {
        return warning.code;
      }),
    ).toEqual(['dataset_differs', 'auth_mode_differs', 'k_differs']);
    expect(comparison.sharedCases).toBe(3);
  });

  it('skips cases without a counted outcome in both runs', () => {
    const empty = buildEvalReport({
      calibrations: [],
      cases: input.cases,
      k: 2,
      trials: [],
    });
    const comparison = compareEvalReports({
      base: { config, report: base },
      candidate: { config, report: empty },
    });

    expect(comparison.sharedCases).toBe(0);
    expect(comparison.mcnemar).toBeNull();
    expect(comparison.warnings[0]?.code).toBe('no_shared_cases');
  });
});
