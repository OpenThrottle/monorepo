import { bootstrapCi } from '../stats/bootstrap.ts';
import { detectionFloor } from '../stats/detection-floor.ts';
import { costPerSuccess, passAtK, passHatK } from '../stats/pass-rate.ts';
import type {
  BuildEvalReportInput,
  EvalReport,
  JudgeAgreement,
  ReportCalibration,
  ReportCaseRow,
  ReportGrader,
  ReportNumbers,
  ReportTrial,
  TrialExclusionReason,
  TrialVerdict,
} from './report-types.ts';
import { gradeCounts, trialVerdict } from './trial-verdict.ts';

/**
 * @description The base rate the detection floor assumes when the observed pass rate is 0, 1 or
 * unknown: the variance is largest at 0.5, so the floor is the most cautious.
 */
const FALLBACK_BASE_RATE = 0.5;

interface JudgedTrial {
  readonly trial: ReportTrial;
  readonly verdict: TrialVerdict;
}

const mean = (values: readonly (number | null)[]): number | null => {
  const present = values.filter((value) => {
    return value !== null;
  });

  if (present.length === 0) {
    return null;
  }

  return (
    present.reduce((sum, value) => {
      return sum + value;
    }, 0) / present.length
  );
};

const findCalibration = (
  calibrations: readonly ReportCalibration[],
  graderId: string,
  graderVersion: string,
): ReportCalibration | null => {
  return (
    calibrations.find((entry) => {
      return (
        entry.graderId === graderId && entry.graderVersion === graderVersion
      );
    }) ?? null
  );
};

const buildGraders = (
  trials: readonly ReportTrial[],
  calibrations: readonly ReportCalibration[],
): ReportGrader[] => {
  const graders = new Map<string, ReportGrader>();

  for (const trial of trials) {
    for (const grade of trial.grades) {
      const key = `${grade.graderKind}\u0000${grade.graderId}\u0000${grade.graderVersion}`;
      const existing = graders.get(key);
      const isJudge = grade.graderKind === 'judge';

      if (existing === undefined) {
        graders.set(key, {
          calibration: isJudge
            ? findCalibration(calibrations, grade.graderId, grade.graderVersion)
            : null,
          counts: gradeCounts(grade, calibrations),
          graderId: grade.graderId,
          graderKind: grade.graderKind,
          graderVersion: grade.graderVersion,
          judgeModel: grade.judgeModel,
          judgeModelVersion: grade.judgeModelVersion,
        });
      }
    }
  }

  return [...graders.values()].sort((a, b) => {
    return (
      a.graderKind.localeCompare(b.graderKind) ||
      a.graderId.localeCompare(b.graderId) ||
      a.graderVersion.localeCompare(b.graderVersion)
    );
  });
};

const weakestJudge = (
  graders: readonly ReportGrader[],
): JudgeAgreement | null => {
  let weakest: JudgeAgreement | null = null;

  for (const grader of graders) {
    const calibration = grader.calibration;

    if (calibration?.kappa == null) {
      continue;
    }

    if (weakest === null || calibration.kappa < weakest.kappa) {
      weakest = {
        graderId: grader.graderId,
        graderVersion: grader.graderVersion,
        kappa: calibration.kappa,
        kappaCiHigh: calibration.kappaCiHigh,
        kappaCiLow: calibration.kappaCiLow,
        status: calibration.status,
      };
    }
  }

  return weakest;
};

const buildCaseRows = (
  input: BuildEvalReportInput,
  judged: readonly JudgedTrial[],
): ReportCaseRow[] => {
  return input.cases.map((evalCase) => {
    const counted = judged.filter((entry) => {
      return (
        entry.trial.caseId === evalCase.caseId &&
        entry.verdict.kind !== 'excluded'
      );
    });
    const passes = counted.filter((entry) => {
      return entry.verdict.kind === 'pass';
    }).length;

    return {
      attemptsCounted: counted.length,
      attemptsPassed: passes,
      caseId: evalCase.caseId,
      passed: counted.length === 0 ? null : passes === counted.length,
      split: evalCase.split,
    };
  });
};

const countExclusions = (
  judged: readonly JudgedTrial[],
): Record<TrialExclusionReason, number> => {
  const excluded: Record<TrialExclusionReason, number> = {
    errored: 0,
    grade_error: 0,
    no_counted_grade: 0,
    usage_limited: 0,
  };

  for (const entry of judged) {
    if (entry.verdict.kind === 'excluded') {
      excluded[entry.verdict.reason] += 1;
    }
  }

  return excluded;
};

const sumCost = (trials: readonly ReportTrial[]): number | null => {
  let total = 0;

  for (const trial of trials) {
    if (trial.costUsd === null) {
      return null;
    }

    total += trial.costUsd;
  }

  return total;
};

/**
 * @description Turns stored rows into a run's report. The trial verdict rule is
 * {@link trialVerdict}; a case passes when every counted attempt passed (and at least one
 * counted). The pass rate is over counted trials with a seeded 10,000-resample bootstrap 95% CI;
 * pass@k and pass^k average the per-case estimators over cases with at least `k` counted
 * attempts; the detection floor is for the number of cases that counted, at the observed pass
 * rate (0.5 when it is 0, 1 or unknown); cost per success divides the cost of every counted trial
 * by its passes.
 * @public
 */
export const buildEvalReport = (input: BuildEvalReportInput): EvalReport => {
  const judged: JudgedTrial[] = input.trials.map((trial) => {
    return { trial, verdict: trialVerdict(trial, input.calibrations) };
  });
  const counted = judged.filter((entry) => {
    return entry.verdict.kind !== 'excluded';
  });
  const outcomes = counted.map((entry) => {
    return entry.verdict.kind === 'pass' ? 1 : 0;
  });
  const passes = outcomes.reduce<number>((sum, outcome) => {
    return sum + outcome;
  }, 0);
  const passRate = counted.length === 0 ? null : passes / counted.length;
  const cases = buildCaseRows(input, judged);
  const casesCounted = cases.filter((row) => {
    return row.attemptsCounted > 0;
  });
  const casesAtK = casesCounted.filter((row) => {
    return row.attemptsCounted >= input.k;
  });
  const hasUsableRate = passRate !== null && passRate > 0 && passRate < 1;
  const baseRate = hasUsableRate ? passRate : FALLBACK_BASE_RATE;
  const graders = buildGraders(input.trials, input.calibrations);
  const numbers: ReportNumbers = {
    casesAtK: casesAtK.length,
    casesCounted: casesCounted.length,
    costPerSuccessUsd: costPerSuccess(
      counted.map((entry) => {
        return {
          costUsd: entry.trial.costUsd,
          passed: entry.verdict.kind === 'pass',
        };
      }),
    ),
    detectionFloor: detectionFloor({ baseRate, n: casesCounted.length }),
    excluded: countExclusions(judged),
    judgeAgreement: weakestJudge(graders),
    passAtK: mean(
      casesAtK.map((row) => {
        return passAtK(row.attemptsCounted, row.attemptsPassed, input.k);
      }),
    ),
    passHatK: mean(
      casesAtK.map((row) => {
        return passHatK(row.attemptsCounted, row.attemptsPassed, input.k);
      }),
    ),
    passRate,
    passRateCi: bootstrapCi(outcomes),
    totalCostUsd: sumCost(input.trials),
    trialsCounted: counted.length,
    trialsExcluded: judged.length - counted.length,
    trialsPassed: passes,
  };

  return { cases, graders, numbers };
};
