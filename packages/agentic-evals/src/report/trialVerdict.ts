import type {
  ReportCalibration,
  ReportGrade,
  ReportTrial,
  TrialVerdict,
} from './report-types.ts';

const graderKey = (graderId: string, graderVersion: string): string => {
  return `${graderId}\u0000${graderVersion}`;
};

/**
 * @description Whether a grade counts toward a trial's verdict (v1 rule): a code grade always
 * does; a judge grade does when that grader id and version's latest calibration is `gating` or
 * `unsupervised`; human grades never do (they are shown, and calibrate judges).
 * @public
 */
export const gradeCounts = (
  grade: Pick<ReportGrade, 'graderId' | 'graderKind' | 'graderVersion'>,
  calibrations: readonly ReportCalibration[],
): boolean => {
  if (grade.graderKind === 'code') {
    return true;
  }

  if (grade.graderKind === 'human') {
    return false;
  }

  const key = graderKey(grade.graderId, grade.graderVersion);
  const calibration = calibrations.find((entry) => {
    return graderKey(entry.graderId, entry.graderVersion) === key;
  });

  return (
    calibration?.status === 'gating' || calibration?.status === 'unsupervised'
  );
};

/**
 * @description The v1 verdict of one trial. A `usage_limited` or `errored` trial is excluded; so
 * is a trial with no counted grade or with a counted grade whose verdict is `error`. Otherwise it
 * fails when any counted grade fails and passes when every counted grade passes.
 * @public
 */
export const trialVerdict = (
  trial: ReportTrial,
  calibrations: readonly ReportCalibration[],
): TrialVerdict => {
  if (trial.status === 'usage_limited') {
    return { kind: 'excluded', reason: 'usage_limited' };
  }

  if (trial.status === 'errored') {
    return { kind: 'excluded', reason: 'errored' };
  }

  const counted = trial.grades.filter((grade) => {
    return gradeCounts(grade, calibrations);
  });

  if (counted.length === 0) {
    return { kind: 'excluded', reason: 'no_counted_grade' };
  }

  if (
    counted.some((grade) => {
      return grade.verdict === 'error';
    })
  ) {
    return { kind: 'excluded', reason: 'grade_error' };
  }

  const anyFailed = counted.some((grade) => {
    return grade.verdict === 'fail';
  });

  return anyFailed ? { kind: 'fail' } : { kind: 'pass' };
};
