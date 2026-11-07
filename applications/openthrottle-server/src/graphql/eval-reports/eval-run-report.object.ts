/**
 * @description GraphQL ObjectTypes for an eval run's report: the config tuple (the run), the
 * graders with whether their grades count, the headline numbers and the per-case rows. Computed
 * by buildEvalReport in @openthrottle/agentic-evals; see docs/openthrottle/eval-system-adr.md
 * (Decisions 6 and 9).
 */

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

import { EvalRunObject } from '../eval-runs/eval-run.object.ts';

@ObjectType('EvalReportInterval', {
  description: `A percentile bootstrap interval (10,000 resamples, fixed seed).`,
})
export class EvalReportIntervalObject {
  @Field(() => Float, { description: `Confidence level, for example 0.95.` })
  confidence!: number;

  @Field(() => Float, { description: `Lower bound.` })
  lower!: number;

  @Field(() => Float, { description: `Upper bound.` })
  upper!: number;
}

@ObjectType('EvalReportExclusions', {
  description: `How many trials were left out of the pass rate, by reason.`,
})
export class EvalReportExclusionsObject {
  @Field(() => Int, { description: `Trials whose attempt errored.` })
  errored!: number;

  @Field(() => Int, {
    description: `Trials where a counted grader returned an error verdict.`,
  })
  gradeError!: number;

  @Field(() => Int, {
    description: `Trials with no grade that counts (no code grade, no gating judge).`,
  })
  noCountedGrade!: number;

  @Field(() => Int, { description: `Trials paused by a usage limit.` })
  usageLimited!: number;
}

@ObjectType('EvalReportJudgeAgreement', {
  description: `Agreement with humans (Cohen's kappa) of the weakest calibrated judge that graded the run.`,
})
export class EvalReportJudgeAgreementObject {
  @Field(() => String, { description: `Grader id of that judge.` })
  graderId!: string;

  @Field(() => String, { description: `Grader version of that judge.` })
  graderVersion!: string;

  @Field(() => Float, { description: `Cohen's kappa.` })
  kappa!: number;

  @Field(() => Float, {
    description: `Upper bound of the bootstrap 95% interval.`,
    nullable: true,
  })
  kappaCiHigh!: number | null;

  @Field(() => Float, {
    description: `Lower bound of the bootstrap 95% interval.`,
    nullable: true,
  })
  kappaCiLow!: number | null;

  @Field(() => String, {
    description: `Calibration status: unsupervised, gating, non_gating or insufficient.`,
  })
  status!: string;
}

@ObjectType('EvalReportNumbers', {
  description: `The headline numbers of one run. Every number is over trials that count: see EvalReportGrader.counts.`,
})
export class EvalReportNumbersObject {
  @Field(() => Int, {
    description: `Cases with at least k counted attempts, the cases pass@k and pass^k average over.`,
  })
  casesAtK!: number;

  @Field(() => Int, {
    description: `Cases with at least one counted attempt.`,
  })
  casesCounted!: number;

  @Field(() => Float, {
    description: `Cost of the counted trials divided by their passes. Null when any counted trial is unpriced or nothing passed.`,
    nullable: true,
  })
  costPerSuccessUsd!: number | null;

  @Field(() => Float, {
    description: `The smallest change in pass rate a paired comparison over this many cases can detect (alpha 0.05, power 0.8). Null when no case counted.`,
    nullable: true,
  })
  detectionFloor!: number | null;

  @Field(() => EvalReportExclusionsObject, {
    description: `Why trials were left out.`,
  })
  excluded!: EvalReportExclusionsObject;

  @Field(() => EvalReportJudgeAgreementObject, {
    description: `Judge agreement with humans. Null when no judge with a kappa graded the run.`,
    nullable: true,
  })
  judgeAgreement!: EvalReportJudgeAgreementObject | null;

  @Field(() => Float, {
    description: `pass@k: the chance at least one of k attempts passes, averaged over cases.`,
    nullable: true,
  })
  passAtK!: number | null;

  @Field(() => Float, {
    description: `pass^k: the chance all k attempts pass, averaged over cases.`,
    nullable: true,
  })
  passHatK!: number | null;

  @Field(() => Float, {
    description: `Passing trials over counted trials. Null when nothing counted.`,
    nullable: true,
  })
  passRate!: number | null;

  @Field(() => EvalReportIntervalObject, {
    description: `Bootstrap 95% interval of the pass rate.`,
    nullable: true,
  })
  passRateCi!: EvalReportIntervalObject | null;

  @Field(() => Float, {
    description: `Cost of every trial. Null when any trial is unpriced.`,
    nullable: true,
  })
  totalCostUsd!: number | null;

  @Field(() => Int, { description: `Trials that count.` })
  trialsCounted!: number;

  @Field(() => Int, { description: `Trials left out of the pass rate.` })
  trialsExcluded!: number;

  @Field(() => Int, { description: `Counted trials that passed.` })
  trialsPassed!: number;
}

@ObjectType('EvalReportGrader', {
  description: `A grader that graded the run, with its calibration and whether its grades count toward the pass rate.`,
})
export class EvalReportGraderObject {
  @Field(() => String, {
    description: `Calibration status of this judge id and version. Null for code and human graders, and for an uncalibrated judge.`,
    nullable: true,
  })
  calibrationStatus!: string | null;

  @Field(() => Boolean, {
    description: `Whether this grader's grades count: code graders and judges calibrated gating or unsupervised. Human grades never count.`,
  })
  counts!: boolean;

  @Field(() => String, { description: `Stable id of the grader.` })
  graderId!: string;

  @Field(() => String, { description: `code, judge or human.` })
  graderKind!: string;

  @Field(() => String, { description: `Grader version.` })
  graderVersion!: string;

  @Field(() => String, { description: `Judge model.`, nullable: true })
  judgeModel!: string | null;

  @Field(() => String, {
    description: `Judge model version when known.`,
    nullable: true,
  })
  judgeModelVersion!: string | null;

  @Field(() => Float, {
    description: `Cohen's kappa of the latest calibration.`,
    nullable: true,
  })
  kappa!: number | null;

  @Field(() => Float, {
    description: `Kappa interval upper bound.`,
    nullable: true,
  })
  kappaCiHigh!: number | null;

  @Field(() => Float, {
    description: `Kappa interval lower bound.`,
    nullable: true,
  })
  kappaCiLow!: number | null;
}

@ObjectType('EvalReportCase', {
  description: `One case of the run: counted attempts, passes, and whether the case passed.`,
})
export class EvalReportCaseObject {
  @Field(() => Int, { description: `Attempts that count.` })
  attemptsCounted!: number;

  @Field(() => Int, { description: `Counted attempts that passed.` })
  attemptsPassed!: number;

  @Field(() => ID, { description: `Case id.` })
  caseId!: string;

  @Field(() => Boolean, {
    description: `True when every counted attempt passed. Null when no attempt counted.`,
    nullable: true,
  })
  passed!: boolean | null;

  @Field(() => String, { description: `dev or test.` })
  split!: string;
}

@ObjectType('EvalRunReport', {
  description: `A run's report: the full config tuple, its graders, the headline numbers and a row per case.`,
})
export class EvalRunReportObject {
  @Field(() => [EvalReportCaseObject], { description: `One row per case.` })
  cases!: EvalReportCaseObject[];

  @Field(() => String, { description: `Name of the dataset that was run.` })
  datasetName!: string;

  @Field(() => [EvalReportGraderObject], {
    description: `Every grader that graded the run.`,
  })
  graders!: EvalReportGraderObject[];

  @Field(() => EvalReportNumbersObject, { description: `Headline numbers.` })
  numbers!: EvalReportNumbersObject;

  @Field(() => EvalRunObject, {
    description: `The run: driver, model, effort, prompt and skill SHAs, auth mode, dataset version, k, budgets and status.`,
  })
  run!: EvalRunObject;
}
