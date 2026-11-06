import type { BootstrapCi } from '../stats/bootstrap-ci.ts';

/**
 * @description One stored grade, reduced to what the report reads.
 * @public
 */
export interface ReportGrade {
  readonly graderId: string;
  readonly graderKind: 'code' | 'human' | 'judge';
  readonly graderVersion: string;
  readonly judgeModel: string | null;
  readonly judgeModelVersion: string | null;
  readonly verdict: 'error' | 'fail' | 'pass';
}

/**
 * @description One stored trial with its grades.
 * @public
 */
export interface ReportTrial {
  readonly attempt: number;
  readonly caseId: string;
  readonly costUsd: number | null;
  readonly grades: readonly ReportGrade[];
  readonly status: 'completed' | 'errored' | 'usage_limited';
}

/**
 * @description One case of the dataset the run executed.
 * @public
 */
export interface ReportCase {
  readonly caseId: string;
  readonly split: string;
}

/**
 * @description The latest calibration of a judge (id and version), reduced to what the report
 * reads. `status` is the calibration status string.
 * @public
 */
export interface ReportCalibration {
  readonly graderId: string;
  readonly graderVersion: string;
  readonly kappa: number | null;
  readonly kappaCiHigh: number | null;
  readonly kappaCiLow: number | null;
  readonly status: string;
}

/**
 * @description Input of `buildEvalReport`.
 * @public
 */
export interface BuildEvalReportInput {
  readonly calibrations: readonly ReportCalibration[];
  readonly cases: readonly ReportCase[];
  readonly k: number;
  readonly trials: readonly ReportTrial[];
}

/**
 * @description Why a trial is left out of the pass rate: the attempt did not finish
 * (`usage_limited`, `errored`), a counted grader could not decide (`grade_error`), or no grade
 * counts yet (`no_counted_grade`).
 * @public
 */
export type TrialExclusionReason =
  'errored' | 'grade_error' | 'no_counted_grade' | 'usage_limited';

/**
 * @description The verdict of one trial under the v1 rule.
 * @public
 */
export type TrialVerdict =
  | { readonly kind: 'excluded'; readonly reason: TrialExclusionReason }
  | { readonly kind: 'fail' }
  | { readonly kind: 'pass' };

/**
 * @description One grader that graded the run, with whether its grades count.
 * @public
 */
export interface ReportGrader {
  readonly calibration: ReportCalibration | null;
  readonly counts: boolean;
  readonly graderId: string;
  readonly graderKind: 'code' | 'human' | 'judge';
  readonly graderVersion: string;
  readonly judgeModel: string | null;
  readonly judgeModelVersion: string | null;
}

/**
 * @description One case of the run: counted attempts, how many passed and whether the case
 * passed (every counted attempt passed). `passed` is `null` when no attempt counted.
 * @public
 */
export interface ReportCaseRow {
  readonly attemptsCounted: number;
  readonly attemptsPassed: number;
  readonly caseId: string;
  readonly passed: boolean | null;
  readonly split: string;
}

/**
 * @description The judge agreement headline: the weakest calibrated judge that grades the run.
 * @public
 */
export interface JudgeAgreement {
  readonly graderId: string;
  readonly graderVersion: string;
  readonly kappa: number;
  readonly kappaCiHigh: number | null;
  readonly kappaCiLow: number | null;
  readonly status: string;
}

/**
 * @description The headline numbers of one run. `k` fields are over the cases with at least `k`
 * counted attempts (`casesAtK`). `costPerSuccessUsd` is `null` when any counted trial is
 * unpriced or nothing passed; `totalCostUsd` is `null` when any trial is unpriced.
 * @public
 */
export interface ReportNumbers {
  readonly casesAtK: number;
  readonly casesCounted: number;
  readonly costPerSuccessUsd: number | null;
  readonly detectionFloor: number | null;
  readonly excluded: Readonly<Record<TrialExclusionReason, number>>;
  readonly judgeAgreement: JudgeAgreement | null;
  readonly passAtK: number | null;
  readonly passHatK: number | null;
  readonly passRate: number | null;
  readonly passRateCi: BootstrapCi | null;
  readonly totalCostUsd: number | null;
  readonly trialsCounted: number;
  readonly trialsExcluded: number;
  readonly trialsPassed: number;
}

/**
 * @description A run's full report.
 * @public
 */
export interface EvalReport {
  readonly cases: readonly ReportCaseRow[];
  readonly graders: readonly ReportGrader[];
  readonly numbers: ReportNumbers;
}
