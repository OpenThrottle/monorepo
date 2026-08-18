/**
 * @description GraphQL ObjectTypes for scheduled agent jobs and their runs. `settingsJson` is a
 * JSON-serialized string (repo convention — no GraphQLJSON scalar), with `endpoint.apiKey` never
 * present. Run *logs* are not here — fetch them via `queueJobLogs`/`queueJobLogTail` keyed by
 * (queueName "Scheduled Agent Jobs", jobId = bullmqJobId).
 */

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `A user-defined scheduled agent job: a prompt run with a driver/model/settings on a cron schedule via one shared BullMQ queue.`,
})
export class ScheduledAgentJobObject {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { description: `Human-friendly schedule name.` })
  name!: string;

  @Field(() => String, { description: `Prompt passed to the agent CLI.` })
  prompt!: string;

  @Field(() => String, {
    description: `Agent driver id (claude | codex | cursor | grok | opencode).`,
  })
  driverId!: string;

  @Field(() => String, {
    description: `Model preset; null uses the driver default.`,
    nullable: true,
  })
  model!: string | null;

  @Field(() => String, {
    description: `JSON-serialized AgentPromptSettings ({ endpoint?, worktree? }); endpoint.apiKey is never present.`,
  })
  settingsJson!: string;

  @Field(() => String, { description: `5- or 6-field cron pattern.` })
  cronPattern!: string;

  @Field(() => String, {
    description: `IANA timezone for the cron pattern; null means UTC.`,
    nullable: true,
  })
  timezone!: string | null;

  @Field(() => Int, {
    description: `Per-run timeout override in ms; null uses the queue default.`,
    nullable: true,
  })
  timeoutMs!: number | null;

  @Field(() => Boolean, {
    description: `Whether the schedule is active (registered as a BullMQ scheduler).`,
  })
  enabled!: boolean;

  @Field(() => String, {
    description: `Process cwd for the agent CLI; null uses WORKSPACE_ROOT.`,
    nullable: true,
  })
  cwd!: string | null;

  @Field(() => ID, {
    description: `Owning user id; null for system-seeded schedules.`,
    nullable: true,
  })
  ownerUserId!: string | null;

  @Field(() => Date, {
    description: `Last time a run started.`,
    nullable: true,
  })
  lastRunAt!: Date | null;

  @Field(() => Date, {
    description: `Next scheduled fire time (from the BullMQ scheduler).`,
    nullable: true,
  })
  nextRunAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType({
  description: `One run of a scheduled agent job. Logs stream to queueJobLogs/queueJobLogTail keyed by bullmqJobId.`,
})
export class ScheduledAgentJobRunObject {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  scheduledAgentJobId!: string;

  @Field(() => String, {
    description: `BullMQ job id — join key to queueJobLogs; null before the run is enqueued.`,
    nullable: true,
  })
  bullmqJobId!: string | null;

  @Field(() => String, {
    description: `queued | running | succeeded | no_op | failed | cancelled. no_op is terminal and NOT an error: the process exited cleanly but the agent reported it did not do the work.`,
  })
  status!: string;

  @Field(() => String)
  driverId!: string;

  @Field(() => String, { nullable: true })
  model!: string | null;

  @Field(() => String, { description: `schedule | manual (run-now).` })
  trigger!: string;

  @Field(() => Int, {
    description: `Child process exit code; null on timeout/cancel/spawn error.`,
    nullable: true,
  })
  exitCode!: number | null;

  @Field(() => String, {
    description: `Failure detail; null on success.`,
    nullable: true,
  })
  errorMessage!: string | null;

  @Field(() => Date, { nullable: true })
  startedAt!: Date | null;

  @Field(() => Date, { nullable: true })
  finishedAt!: Date | null;

  @Field(() => Date, {
    description: `When cancellation was requested; null if never cancelled.`,
    nullable: true,
  })
  cancelRequestedAt!: Date | null;

  @Field(() => String, {
    description: `Effective run settings at execution time (driver/model/run-config), serialized JSON; null for legacy/pre-snapshot runs. Never contains endpoint.apiKey.`,
    nullable: true,
  })
  settingsSnapshotJson!: string | null;

  @Field(() => Float, {
    description: `Input/prompt tokens for the run, parsed from the CLI output; null when unreported. Float because GraphQL Int is 32-bit.`,
    nullable: true,
  })
  inputTokens!: number | null;

  @Field(() => Float, {
    description: `Output/completion tokens for the run; null when unreported.`,
    nullable: true,
  })
  outputTokens!: number | null;

  @Field(() => Float, {
    description: `Prompt-cache read tokens for the run; null when unreported.`,
    nullable: true,
  })
  cacheReadTokens!: number | null;

  @Field(() => Float, {
    description: `Prompt-cache write tokens for the run; null when unreported.`,
    nullable: true,
  })
  cacheWriteTokens!: number | null;

  @Field(() => Float, {
    description: `Reasoning tokens for the run, when accounted separately; null when unreported.`,
    nullable: true,
  })
  reasoningTokens!: number | null;

  @Field(() => Float, {
    description: `Total tokens for the run; null when nothing reported.`,
    nullable: true,
  })
  totalTokens!: number | null;

  @Field(() => Float, {
    description: `Estimated dollar cost of the run, when the backend prices it; null when unpriced.`,
    nullable: true,
  })
  costUsd!: number | null;

  @Field(() => Date)
  createdAt!: Date;
}
