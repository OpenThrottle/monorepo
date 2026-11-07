/**
 * @description GraphQL input type for recording an agent trajectory.
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class RecordAgentTrajectoryInput {
  @Field(() => String, {
    description: `Agent driver that produced the run, for example claude.`,
  })
  driver!: string;

  @Field(() => Int, {
    description: `Wall-clock duration of the run in milliseconds.`,
    nullable: true,
  })
  durationMs!: number | null;

  @Field(() => Int, {
    description: `Process exit code of the run.`,
    nullable: true,
  })
  exitCode!: number | null;

  @Field(() => String, {
    description: `Optional key that makes recording idempotent: a second call with the same key returns the stored trajectory instead of inserting another. Clients use session:<sessionId>:<toolUseId> for session uploads and spawned:<planRunId>:<iteration> for spawned runs. At most 200 characters.`,
    nullable: true,
  })
  idempotencyKey!: string | null;

  @Field(() => String, {
    description: `Model that ran, when known.`,
    nullable: true,
  })
  model!: string | null;

  @Field(() => String, {
    description: `Free-form result label for the run, for example completed.`,
    nullable: true,
  })
  outcome!: string | null;

  @Field(() => ID, { description: `Plan run the trajectory belongs to.` })
  planRunId!: string;

  @Field(() => String, {
    description: `How the trajectory was captured: spawned or session_upload.`,
  })
  source!: string;

  @Field(() => ID, {
    description: `Task the run worked on. Omit for a run not scoped to one task.`,
    nullable: true,
  })
  taskId!: string | null;

  @Field(() => String, {
    description: `The ATIF document as a JSON string. Validated, then capped server-side at 4 MiB.`,
  })
  trajectoryJson!: string;
}

@InputType()
export class ReplaceAgentTrajectoryInput {
  @Field(() => Int, {
    description: `Wall-clock duration of the run in milliseconds.`,
    nullable: true,
  })
  durationMs!: number | null;

  @Field(() => Int, {
    description: `Process exit code of the run.`,
    nullable: true,
  })
  exitCode!: number | null;

  @Field(() => String, {
    description: `Optional key that makes a later recordAgentTrajectory with the same key a no-op. At most 200 characters.`,
    nullable: true,
  })
  idempotencyKey!: string | null;

  @Field(() => String, {
    description: `Model that ran, when known.`,
    nullable: true,
  })
  model!: string | null;

  @Field(() => String, {
    description: `Free-form result label for the run, for example completed.`,
    nullable: true,
  })
  outcome!: string | null;

  @Field(() => ID, {
    description: `Plan run the trajectory belongs to after the replace.`,
  })
  planRunId!: string;

  @Field(() => String, {
    description: `The ATIF document as a JSON string. Validated, then capped server-side at 4 MiB.`,
  })
  trajectoryJson!: string;
}
