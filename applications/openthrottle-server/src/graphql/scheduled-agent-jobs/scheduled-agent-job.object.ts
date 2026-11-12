/**
 * @description GraphQL ObjectTypes for scheduled agent jobs and their runs. `settingsJson` is a
 * JSON-serialized string (repo convention — no GraphQLJSON scalar), with `endpoint.apiKey` never
 * present. Run *logs* are not here — fetch them via `queueJobLogs`/`queueJobLogTail` keyed by
 * (queueName "Scheduled Agent Jobs", jobId = bullmqJobId).
 */

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `Display fields for the repository checkout a schedule or run targeted — enough to label the target without a second round trip.`,
})
export class ScheduledAgentJobRepositoryObject {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { description: `Human-friendly checkout name.` })
  displayName!: string;

  @Field(() => String, {
    description: `Canonical absolute path on the server host.`,
  })
  filesystemPath!: string;
}

@ObjectType({
  description: `A user-defined scheduled agent job: a prompt run with a driver/model/settings on a cron, interval or run-once schedule via one shared BullMQ queue.`,
})
export class ScheduledAgentJobObject {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { description: `Human-friendly schedule name.` })
  name!: string;

  @Field(() => String, { description: `Prompt passed to the agent CLI.` })
  prompt!: string;

  @Field(() => String, {
    description: `Agent driver id (antigravity | claude | codex | cursor | grok | opencode).`,
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

  @Field(() => String, {
    description: `How the schedule fires: cron (cronPattern in timezone), interval (intervalMs after the previous run finishes) or once (a single run at runAt, after which the schedule is disabled).`,
  })
  scheduleKind!: string;

  @Field(() => String, {
    description: `5- or 6-field cron pattern for a cron schedule; null for interval and once schedules.`,
    nullable: true,
  })
  cronPattern!: string | null;

  @Field(() => Int, {
    description: `For an interval schedule: ms from the end of one run to the start of the next (elapsed time, so DST-safe). Null for other kinds.`,
    nullable: true,
  })
  intervalMs!: number | null;

  @Field(() => Date, {
    description: `For a once schedule: when its single run is due. Null for other kinds.`,
    nullable: true,
  })
  runAt!: Date | null;

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

  @Field(() => String, {
    description: `What happens to a fire that starts more than misfireThresholdMs late (server down, or a backed-up queue): skip records it as a missed run; catch_up_once runs the most recent late fire once and records any earlier ones as missed. A fire within the threshold always runs.`,
  })
  misfirePolicy!: string;

  @Field(() => Int, {
    description: `How late (ms after its cron slot) a fire may start and still count as on time; at least 60000.`,
  })
  misfireThresholdMs!: number;

  @Field(() => Boolean, {
    description: `Whether the schedule is active (registered as a BullMQ scheduler).`,
  })
  enabled!: boolean;

  @Field(() => String, {
    deprecationReason: `Use repositoryCheckoutId to target a registered repository checkout; cwd is only consulted when no checkout is set.`,
    description: `Legacy explicit process cwd for the agent CLI, used only when repositoryCheckoutId is null; null then uses WORKSPACE_ROOT.`,
    nullable: true,
  })
  cwd!: string | null;

  @Field(() => ID, {
    description: `Registered repository checkout this schedule runs in; the server resolves its cwd from this. Null means the legacy cwd / WORKSPACE_ROOT fallback.`,
    nullable: true,
  })
  repositoryCheckoutId!: string | null;

  @Field(() => ScheduledAgentJobRepositoryObject, {
    description: `The targeted checkout resolved for display; null when the schedule targets none or the checkout has been deleted.`,
    nullable: true,
  })
  repository?: ScheduledAgentJobRepositoryObject | null;

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
    description: `queued | running | succeeded | no_op | failed | cancelled | usage_limited | missed. no_op is terminal and NOT an error: the process exited cleanly but the agent reported it did not do the work. usage_limited is terminal and NOT an error: the agent CLI stopped on a Claude subscription usage limit (see usageLimitResetsAt); a continuation run (trigger resume, resumeOfRunId = this run) may have been enqueued. missed is created terminal: a cron fire the schedule's misfire policy did not run (see scheduledFor and errorMessage); no agent was spawned.`,
  })
  status!: string;

  @Field(() => Date, {
    description: `The slot this run belongs to, for trigger schedule (missed runs included): the cron slot, or when an interval or once fire was due. Null for manual and resume runs and for runs recorded before slot accounting.`,
    nullable: true,
  })
  scheduledFor!: Date | null;

  @Field(() => String)
  driverId!: string;

  @Field(() => String, { nullable: true })
  model!: string | null;

  @Field(() => String, {
    description: `schedule (a cron, interval or once fire) | manual (run-now) | resume (delayed continuation of a usage_limited run).`,
  })
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

  @Field(() => ID, {
    description: `Repository checkout this run targeted at fire time; null for a legacy run, the WORKSPACE_ROOT fallback, or a checkout since deleted. A snapshot — the schedule's current target may differ.`,
    nullable: true,
  })
  repositoryCheckoutId!: string | null;

  @Field(() => ScheduledAgentJobRepositoryObject, {
    description: `The targeted checkout resolved for display; null when the run targeted none or the checkout has been deleted.`,
    nullable: true,
  })
  repository?: ScheduledAgentJobRepositoryObject | null;

  @Field(() => String, {
    description: `The exact directory the agent CLI was spawned in for this run, after the checkout -> cwd -> WORKSPACE_ROOT precedence. Authoritative record of where the run happened; null for legacy runs.`,
    nullable: true,
  })
  resolvedCwd!: string | null;

  @Field(() => Date, {
    description: `When the usage limit that stopped this run lifts, as reported by the agent CLI; null when the run was not usage_limited or no reset time was reported.`,
    nullable: true,
  })
  usageLimitResetsAt!: Date | null;

  @Field(() => String, {
    description: `Raw usage-limit window that stopped this run (five_hour, seven_day, ...); null when the run was not usage_limited or the window was not reported.`,
    nullable: true,
  })
  usageLimitType!: string | null;

  @Field(() => ID, {
    description: `The usage_limited run this run continues (trigger resume); null for every ordinary run.`,
    nullable: true,
  })
  resumeOfRunId!: string | null;

  @Field(() => Date)
  createdAt!: Date;
}
