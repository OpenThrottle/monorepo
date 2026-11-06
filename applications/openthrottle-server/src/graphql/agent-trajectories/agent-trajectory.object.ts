/**
 * @description GraphQL ObjectType for a recorded agent trajectory. Mirrors the agent_trajectories
 * entity from @openthrottle/nestjs-repositories (migration 145); the ATIF document is exposed as a
 * JSON string because the schema has no JSON scalar.
 */

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('AgentTrajectory', {
  description: `One ATIF trajectory recorded for a plan run: the structured record of what an agent did, plus summary columns derived from it.`,
})
export class AgentTrajectoryObject {
  @Field(() => Int, {
    description: `UTF-8 byte length of the stored trajectory JSON, after any server-side capping.`,
  })
  byteSize!: number;

  @Field(() => Int, {
    description: `Cached prompt tokens (included in inputTokens). Null when the run reported none.`,
    nullable: true,
  })
  cachedTokens!: number | null;

  @Field(() => Float, {
    description: `Cost of the run in USD. Null when unpriceable, which is not the same as zero.`,
    nullable: true,
  })
  costUsd!: number | null;

  @Field(() => Date, { description: `When the trajectory was recorded.` })
  createdAt!: Date;

  @Field(() => String, {
    description: `Agent driver that produced the run, for example claude.`,
  })
  driver!: string;

  @Field(() => Int, {
    description: `Wall-clock duration of the run in milliseconds. Null when unknown.`,
    nullable: true,
  })
  durationMs!: number | null;

  @Field(() => Int, {
    description: `Process exit code of the run. Null when unknown.`,
    nullable: true,
  })
  exitCode!: number | null;

  @Field(() => ID, { description: `Trajectory id.` })
  id!: string;

  @Field(() => String, {
    description: `Idempotency key the trajectory was recorded under. Null when recorded without one.`,
    nullable: true,
  })
  idempotencyKey!: string | null;

  @Field(() => Boolean, {
    description: `True when the run ended before it could finish, so the trajectory is partial.`,
  })
  incomplete!: boolean;

  @Field(() => Int, {
    description: `Prompt tokens consumed, including cached tokens. Null when the run reported none.`,
    nullable: true,
  })
  inputTokens!: number | null;

  @Field(() => String, {
    description: `Model that ran, when known.`,
    nullable: true,
  })
  model!: string | null;

  @Field(() => String, {
    description: `Free-form result label for the run, for example completed. Null when unknown.`,
    nullable: true,
  })
  outcome!: string | null;

  @Field(() => Int, {
    description: `Completion tokens produced. Null when the run reported none.`,
    nullable: true,
  })
  outputTokens!: number | null;

  @Field(() => ID, { description: `Plan run the trajectory belongs to.` })
  planRunId!: string;

  @Field(() => String, {
    description: `ATIF schema version of the stored document, for example ATIF-v1.8.`,
  })
  schemaVersion!: string;

  @Field(() => String, {
    description: `How the trajectory was captured: spawned by the OpenThrottle runner, or session_upload from an interactive session.`,
  })
  source!: string;

  @Field(() => ID, {
    description: `Task the run worked on. Null for a run not scoped to one task.`,
    nullable: true,
  })
  taskId!: string | null;

  @Field(() => Int, {
    description: `Number of tool calls across all steps.`,
  })
  toolCallCount!: number;

  @Field(() => String, {
    description: `The stored ATIF document serialized with JSON.stringify.`,
  })
  trajectoryJson!: string;

  @Field(() => Boolean, {
    description: `True when the server elided observation content to fit the size caps.`,
  })
  truncated!: boolean;
}
