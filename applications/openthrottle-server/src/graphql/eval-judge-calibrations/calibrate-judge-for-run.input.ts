/**
 * @description GraphQL input type for calibrating a judge over one eval run: the run's judge
 * grades are paired with human labels on the trials' trajectories, calibrated and recorded.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class CalibrateJudgeForRunInput {
  @Field(() => String, { description: `Id of the judge grader to calibrate.` })
  graderId!: string;

  @Field(() => String, {
    description: `Version of the judge grader to calibrate.`,
  })
  graderVersion!: string;

  @Field(() => Boolean, {
    defaultValue: false,
    description: `True when calibrating the held-out judge. Defaults to false.`,
  })
  heldOut!: boolean;

  @Field(() => ID, { description: `Run whose judge grades are calibrated.` })
  runId!: string;

  @Field(() => String, {
    description: `Only use trials whose case is in this split: dev or test. Omit for every trial.`,
    nullable: true,
  })
  split!: string | null;
}
