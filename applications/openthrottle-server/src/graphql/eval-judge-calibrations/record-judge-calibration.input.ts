/**
 * @description GraphQL input type for recording a judge calibration whose statistics were computed
 * elsewhere (use calibrateJudgeForRun to compute and record in one call). The creator is taken
 * from the caller's identity.
 */

import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class RecordJudgeCalibrationInput {
  @Field(() => Float, {
    description: `Catch rate in [0, 1]. Omit when undefined.`,
    nullable: true,
  })
  catchRate!: number | null;

  @Field(() => ID, {
    description: `Dataset whose cases were labelled. Omit for an ad hoc calibration.`,
    nullable: true,
  })
  datasetId!: string | null;

  @Field(() => Float, {
    description: `False-fail rate in [0, 1]. Omit when undefined.`,
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
    defaultValue: false,
    description: `True for the held-out judge. Defaults to false.`,
  })
  heldOut!: boolean;

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
    description: `Cohen's kappa. Omit when undefined.`,
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

  @Field(() => Int, { description: `Pairs used for the statistics.` })
  n!: number;

  @Field(() => Int, {
    defaultValue: 0,
    description: `Pairs left out because the judge returned an error verdict.`,
  })
  nExcluded!: number;

  @Field(() => ID, {
    description: `Eval run the grades were read from. Omit when pairs were supplied directly.`,
    nullable: true,
  })
  runId!: string | null;

  @Field(() => String, {
    description: `Dataset split the labelled cases came from: dev or test. Needs datasetId.`,
    nullable: true,
  })
  split!: string | null;

  @Field(() => String, {
    description: `unsupervised, gating, non_gating or insufficient.`,
  })
  status!: string;
}
