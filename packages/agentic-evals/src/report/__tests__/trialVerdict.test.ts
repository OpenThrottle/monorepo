import { describe, expect, it } from 'vitest';

import type {
  ReportCalibration,
  ReportGrade,
  ReportTrial,
} from '../report-types.ts';
import { gradeCounts, trialVerdict } from '../trialVerdict.ts';

const calibration = (
  status: string,
  graderVersion = '1',
): ReportCalibration => {
  return {
    graderId: 'judge-a',
    graderVersion,
    kappa: 0.7,
    kappaCiHigh: 0.9,
    kappaCiLow: 0.5,
    status,
  };
};

const grade = (
  graderKind: ReportGrade['graderKind'],
  verdict: ReportGrade['verdict'],
  graderId = graderKind === 'judge' ? 'judge-a' : `${graderKind}-a`,
): ReportGrade => {
  return {
    graderId,
    graderKind,
    graderVersion: '1',
    judgeModel: graderKind === 'judge' ? 'model' : null,
    judgeModelVersion: null,
    verdict,
  };
};

const trial = (
  grades: readonly ReportGrade[],
  status: ReportTrial['status'] = 'completed',
): ReportTrial => {
  return { attempt: 1, caseId: 'c', costUsd: 1, grades, status };
};

describe('gradeCounts', () => {
  it('counts code grades without a calibration', () => {
    expect(gradeCounts(grade('code', 'pass'), [])).toBe(true);
  });

  it('never counts human grades', () => {
    expect(gradeCounts(grade('human', 'pass'), [calibration('gating')])).toBe(
      false,
    );
  });

  it.each(['gating', 'unsupervised'])(
    'counts a judge calibrated %s',
    (status) => {
      expect(gradeCounts(grade('judge', 'pass'), [calibration(status)])).toBe(
        true,
      );
    },
  );

  it.each(['non_gating', 'insufficient'])(
    'does not count a judge calibrated %s',
    (status) => {
      expect(gradeCounts(grade('judge', 'pass'), [calibration(status)])).toBe(
        false,
      );
    },
  );

  it('does not count an uncalibrated judge or another version', () => {
    expect(gradeCounts(grade('judge', 'pass'), [])).toBe(false);
    expect(
      gradeCounts(grade('judge', 'pass'), [calibration('gating', '2')]),
    ).toBe(false);
  });
});

describe('trialVerdict', () => {
  const gating = [calibration('gating')];

  it('excludes a usage_limited trial', () => {
    expect(
      trialVerdict(trial([grade('code', 'pass')], 'usage_limited'), []),
    ).toEqual({
      kind: 'excluded',
      reason: 'usage_limited',
    });
  });

  it('excludes an errored trial', () => {
    expect(trialVerdict(trial([grade('code', 'fail')], 'errored'), [])).toEqual(
      {
        kind: 'excluded',
        reason: 'errored',
      },
    );
  });

  it('excludes a trial with no counted grade', () => {
    const grades = [grade('human', 'pass'), grade('judge', 'pass')];

    expect(trialVerdict(trial(grades), [])).toEqual({
      kind: 'excluded',
      reason: 'no_counted_grade',
    });
    expect(trialVerdict(trial([]), gating)).toEqual({
      kind: 'excluded',
      reason: 'no_counted_grade',
    });
  });

  it('excludes a trial whose counted grade errored, even beside a failure', () => {
    const grades = [grade('code', 'fail'), grade('judge', 'error')];

    expect(trialVerdict(trial(grades), gating)).toEqual({
      kind: 'excluded',
      reason: 'grade_error',
    });
  });

  it('ignores an error from a grade that does not count', () => {
    const grades = [grade('code', 'pass'), grade('judge', 'error')];

    expect(trialVerdict(trial(grades), [])).toEqual({ kind: 'pass' });
  });

  it('fails when any counted grade fails', () => {
    const grades = [grade('code', 'pass'), grade('judge', 'fail')];

    expect(trialVerdict(trial(grades), gating)).toEqual({ kind: 'fail' });
  });

  it('passes when every counted grade passes, ignoring uncounted failures', () => {
    const grades = [
      grade('code', 'pass'),
      grade('judge', 'pass'),
      grade('human', 'fail'),
    ];

    expect(trialVerdict(trial(grades), gating)).toEqual({ kind: 'pass' });
  });
});
