/**
 * @description GraphQL ObjectTypes for a judge calibration. Mirrors the eval_judge_calibrations
 * entity from @openthrottle/nestjs-repositories (migration 148).
 */

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('EvalJudgeCalibration', {
  description: `One measurement of a judge (or critic) against human labels: kappa with a bootstrap 95% interval, catch rate, false-fail rate and the resulting gating status.`,
})
export class EvalJudgeCalibrationObject {
  @Field(() => Float, {
    description: `P(judge says fail | human says fail). Null when the humans never failed a trial.`,
    nullable: true,
  })
  catchRate!: number | null;

  @Field(() => Date, { description: `When the calibration was recorded.` })
  createdAt!: Date;

  @Field(() => String, {
    description: `Who recorded the calibration, stamped from the caller's identity.`,
  })
  createdBy!: string;

  @Field(() => ID, {
    description: `Dataset whose cases were labelled. Null for an ad hoc calibration.`,
    nullable: true,
  })
  datasetId!: string | null;

  @Field(() => Float, {
    description: `P(judge says fail | human says pass). Null when the humans never passed a trial.`,
    nullable: true,
  })
  falseFailRate!: number | null;

  @Field(() => String, { description: `Id of the grader that was calibrated.` })
  graderId!: string;

  @Field(() => String, {
    description: `Version of the grader that was calibrated.`,
  })
  graderVersion!: string;

  @Field(() => Boolean, {
    description: `True when this is the held-out judge that no loop, critic or prompt optimization sees.`,
  })
  heldOut!: boolean;

  @Field(() => ID, { description: `Calibration id.` })
  id!: string;

  @Field(() => String, {
    description: `Driver that ran the judge.`,
    nullable: true,
  })
  judgeDriver!: string | null;

  @Field(() => String, { description: `Model that ran the judge.` })
  judgeModel!: string;

  @Field(() => String, {
    description: `Version or snapshot of the judge model when known.`,
    nullable: true,
  })
  judgeModelVersion!: string | null;

  @Field(() => Float, {
    description: `Cohen's kappa. Null when undefined: no pairs, or a constant rater.`,
    nullable: true,
  })
  kappa!: number | null;

  @Field(() => Float, {
    description: `Upper bound of the bootstrap 95% interval of kappa.`,
    nullable: true,
  })
  kappaCiHigh!: number | null;

  @Field(() => Float, {
    description: `Lower bound of the bootstrap 95% interval of kappa.`,
    nullable: true,
  })
  kappaCiLow!: number | null;

  @Field(() => Int, {
    description: `Pairs used for the statistics. Judge error verdicts are not counted.`,
  })
  n!: number;

  @Field(() => Int, {
    description: `Pairs left out because the judge returned an error verdict.`,
  })
  nExcluded!: number;

  @Field(() => ID, {
    description: `Eval run the judge grades were read from. Null when pairs were supplied directly.`,
    nullable: true,
  })
  runId!: string | null;

  @Field(() => String, {
    description: `Dataset split the labelled cases came from (dev or test). Null when not split-scoped.`,
    nullable: true,
  })
  split!: string | null;

  @Field(() => String, {
    description: `unsupervised (kappa >= 0.8), gating (>= 0.6), non_gating (below) or insufficient (too few pairs).`,
  })
  status!: string;
}

@ObjectType('CalibrateJudgeForRunResult', {
  description: `The recorded calibration of a judge over one run, with the trials that could not be paired.`,
})
export class CalibrateJudgeForRunResultObject {
  @Field(() => EvalJudgeCalibrationObject, {
    description: `The calibration that was computed and recorded.`,
  })
  calibration!: EvalJudgeCalibrationObject;

  @Field(() => Int, {
    description: `Graded trials left out because their human raters disagreed with each other.`,
  })
  nConflicted!: number;

  @Field(() => Int, {
    description: `Graded trials left out because they have no trajectory or no human label.`,
  })
  nUnlabeled!: number;
}
