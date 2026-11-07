/**
 * @description GraphQL input type for recording one eval trial. Re-recording the same
 * (run, case, attempt) replaces the earlier row, so a resumed run can re-record a paused trial.
 */

import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class RecordEvalTrialInput {
  @Field(() => Int, { description: `Attempt number, starting at 1.` })
  attempt!: number;

  @Field(() => ID, { description: `Case that was attempted.` })
  caseId!: string;

  @Field(() => Float, {
    description: `Cost of the attempt in USD. Omit when unpriceable.`,
    nullable: true,
  })
  costUsd!: number | null;

  @Field(() => Int, {
    description: `Wall-clock duration in milliseconds.`,
    nullable: true,
  })
  durationMs!: number | null;

  @Field(() => String, {
    description: `Failure message for an errored trial.`,
    nullable: true,
  })
  error!: string | null;

  @Field(() => ID, { description: `Run the trial belongs to.` })
  runId!: string;

  @Field(() => String, {
    description: `How the attempt ended: completed, errored or usage_limited.`,
  })
  status!: string;

  @Field(() => ID, {
    description: `The recorded trajectory the attempt produced.`,
    nullable: true,
  })
  trajectoryId!: string | null;
}
