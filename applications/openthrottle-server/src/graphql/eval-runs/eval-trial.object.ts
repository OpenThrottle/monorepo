/**
 * @description GraphQL ObjectType for an eval trial. Mirrors the eval_trials entity from
 * @openthrottle/nestjs-repositories (migration 147). `grades` and `labels` are field resolvers;
 * labels are the human labels on the trial's trajectory.
 */

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('EvalTrial', {
  description: `One attempt at one case within a run, linked to the trajectory that recorded it.`,
})
export class EvalTrialObject {
  @Field(() => Int, { description: `Attempt number, starting at 1.` })
  attempt!: number;

  @Field(() => ID, { description: `Case the trial attempted.` })
  caseId!: string;

  @Field(() => Float, {
    description: `Cost of the attempt in USD. Null when unpriceable, which is not the same as zero.`,
    nullable: true,
  })
  costUsd!: number | null;

  @Field(() => Date, { description: `When the trial was recorded.` })
  createdAt!: Date;

  @Field(() => Int, {
    description: `Wall-clock duration in milliseconds. Null when unknown.`,
    nullable: true,
  })
  durationMs!: number | null;

  @Field(() => String, {
    description: `Failure message for an errored trial.`,
    nullable: true,
  })
  error!: string | null;

  @Field(() => ID, { description: `Trial id.` })
  id!: string;

  @Field(() => ID, { description: `Run the trial belongs to.` })
  runId!: string;

  @Field(() => String, {
    description: `How the attempt ended: completed, errored, or usage_limited (a pause excluded from pass rates).`,
  })
  status!: string;

  @Field(() => ID, {
    description: `The trajectory the attempt produced. Null when none was captured.`,
    nullable: true,
  })
  trajectoryId!: string | null;
}
