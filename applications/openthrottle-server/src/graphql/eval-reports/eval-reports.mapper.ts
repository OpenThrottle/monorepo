/**
 * @description Maps the agentic-evals report and comparison values to their GraphQL objects.
 */

import type {
  BootstrapCi,
  EvalComparison,
  EvalReport,
} from '@openthrottle/agentic-evals';

import type { EvalRunObject } from '../eval-runs/eval-run.object.ts';
import type { EvalRunComparisonObject } from './eval-run-comparison.object.ts';
import type {
  EvalReportIntervalObject,
  EvalRunReportObject,
} from './eval-run-report.object.ts';

const toInterval = (
  ci: BootstrapCi | null,
): EvalReportIntervalObject | null => {
  if (ci === null) {
    return null;
  }

  return { confidence: ci.confidence, lower: ci.lower, upper: ci.upper };
};

export const toEvalRunReportObject = (
  run: EvalRunObject,
  datasetName: string,
  report: EvalReport,
): EvalRunReportObject => {
  const { numbers } = report;

  return {
    cases: report.cases.map((row) => {
      return { ...row };
    }),
    datasetName,
    graders: report.graders.map((grader) => {
      return {
        calibrationStatus: grader.calibration?.status ?? null,
        counts: grader.counts,
        graderId: grader.graderId,
        graderKind: grader.graderKind,
        graderVersion: grader.graderVersion,
        judgeModel: grader.judgeModel,
        judgeModelVersion: grader.judgeModelVersion,
        kappa: grader.calibration?.kappa ?? null,
        kappaCiHigh: grader.calibration?.kappaCiHigh ?? null,
        kappaCiLow: grader.calibration?.kappaCiLow ?? null,
      };
    }),
    numbers: {
      casesAtK: numbers.casesAtK,
      casesCounted: numbers.casesCounted,
      costPerSuccessUsd: numbers.costPerSuccessUsd,
      detectionFloor: numbers.detectionFloor,
      excluded: {
        errored: numbers.excluded.errored,
        gradeError: numbers.excluded.grade_error,
        noCountedGrade: numbers.excluded.no_counted_grade,
        usageLimited: numbers.excluded.usage_limited,
      },
      judgeAgreement: numbers.judgeAgreement,
      passAtK: numbers.passAtK,
      passHatK: numbers.passHatK,
      passRate: numbers.passRate,
      passRateCi: toInterval(numbers.passRateCi),
      totalCostUsd: numbers.totalCostUsd,
      trialsCounted: numbers.trialsCounted,
      trialsExcluded: numbers.trialsExcluded,
      trialsPassed: numbers.trialsPassed,
    },
    run,
  };
};

export const toEvalRunComparisonObject = (
  base: EvalRunReportObject,
  candidate: EvalRunReportObject,
  comparison: EvalComparison,
): EvalRunComparisonObject => {
  return {
    base,
    candidate,
    improvedCaseIds: [...comparison.improvedCaseIds],
    mcnemar: comparison.mcnemar,
    regressedCaseIds: [...comparison.regressedCaseIds],
    sharedCases: comparison.sharedCases,
    warnings: comparison.warnings.map((warning) => {
      return { code: warning.code, message: warning.message };
    }),
  };
};
