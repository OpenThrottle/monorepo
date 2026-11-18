/**
 * @description TypeORM entity for the scheduled_agent_job_runs table (databases/openthrottle/migrations/082, 087,
 * 095, 096, 139, 141, 178): the
 * append-only run history (status/timing/exit) for a scheduled_agent_jobs row. Extends
 * `BaseHardDeleteModel`: a run is history, never user-deleted, and the table has no `updated_at`.
 * `scheduledAgentJobId` is a plain column, not a relation: the job is soft deleted (a delete fires
 * no foreign key action), so a deleted job's runs stay and the cross-schedule run queries join the
 * job to skip them. Run *logs* are not here — they stream to the JSONL sink
 * (queueJobLogs/queueJobLogTail), joined by `bullmqJobId`.
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity } from 'typeorm';

import type { ScheduledAgentJobDriverId } from '../scheduled-agent-jobs/scheduled-agent-jobs.types.ts';
import type {
  ScheduledAgentJobRunSettingsSnapshot,
  ScheduledAgentJobRunStatus,
  ScheduledAgentJobRunTrigger,
} from './scheduled-agent-job-runs.types.ts';

/**
 * Postgres returns bigint/numeric as strings (to avoid precision loss). Token counts
 * and costs here fit comfortably in JS numbers, so read them back as `number | null`.
 * Mirrors agent_token_usage's transformer (migration 083 / OT plan a55b76ba).
 */
const nullableNumberColumn = {
  from: (value: string | null): number | null =>
    value == null ? null : Number(value),
  to: (value: number | null): number | null => value,
};

@Entity('scheduled_agent_job_runs')
export class ScheduledAgentJobRun extends BaseHardDeleteModel {
  /** BullMQ job id; the join key to queueJobLogs (queueName, jobId). Equals the run id for run-now. */
  @Column({ name: 'bullmq_job_id', nullable: true, type: 'text' })
  bullmqJobId!: string | null;

  /** Durable cancel marker set by cancelScheduledAgentJobRun; the processor aborts when set. */
  @Column({
    name: 'cancel_requested_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  cancelRequestedAt!: Date | null;

  /** Driver id snapshot at run time. */
  @Column({ name: 'driver_id', type: 'text' })
  driverId!: ScheduledAgentJobDriverId;

  /** Failure/timeout/cancel detail; null on success. */
  @Column({ name: 'error_message', nullable: true, type: 'text' })
  errorMessage!: string | null;

  /** Child process exit code from runAgentPrompt; null on timeout/cancel/spawn error. */
  @Column({ name: 'exit_code', nullable: true, type: 'integer' })
  exitCode!: number | null;

  @Column({
    name: 'finished_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  finishedAt!: Date | null;

  /** Model snapshot at run time; null used the driver default. */
  @Column({ name: 'model', nullable: true, type: 'text' })
  model!: string | null;

  /** Effective run settings snapshot at execution time; null for legacy/pre-snapshot runs. */
  @Column({ name: 'settings_snapshot', nullable: true, type: 'jsonb' })
  settingsSnapshot!: ScheduledAgentJobRunSettingsSnapshot | null;

  /** Prompt/input tokens parsed from the CLI output; null when unreported. */
  @Column({
    name: 'input_tokens',
    nullable: true,
    transformer: nullableNumberColumn,
    type: 'bigint',
  })
  inputTokens!: number | null;

  /** Completion/output tokens parsed from the CLI output; null when unreported. */
  @Column({
    name: 'output_tokens',
    nullable: true,
    transformer: nullableNumberColumn,
    type: 'bigint',
  })
  outputTokens!: number | null;

  /** Prompt-cache read tokens; null when unreported. */
  @Column({
    name: 'cache_read_tokens',
    nullable: true,
    transformer: nullableNumberColumn,
    type: 'bigint',
  })
  cacheReadTokens!: number | null;

  /** Prompt-cache write tokens; null when unreported. */
  @Column({
    name: 'cache_write_tokens',
    nullable: true,
    transformer: nullableNumberColumn,
    type: 'bigint',
  })
  cacheWriteTokens!: number | null;

  /** Reasoning/thinking tokens accounted separately; null when unreported. */
  @Column({
    name: 'reasoning_tokens',
    nullable: true,
    transformer: nullableNumberColumn,
    type: 'bigint',
  })
  reasoningTokens!: number | null;

  /** Total tokens (backend explicit total else input+output); null when nothing reported. */
  @Column({
    name: 'total_tokens',
    nullable: true,
    transformer: nullableNumberColumn,
    type: 'bigint',
  })
  totalTokens!: number | null;

  /** Estimated dollar cost of the run when the backend prices it; null when unpriced. */
  @Column({
    name: 'cost_usd',
    nullable: true,
    transformer: nullableNumberColumn,
    type: 'numeric',
  })
  costUsd!: number | null;

  /** Un-normalized usage payload retained for audit/debug; null when no usage parsed. */
  @Column({ name: 'raw_usage', nullable: true, type: 'jsonb' })
  rawUsage!: Record<string, unknown> | null;

  /**
   * The repository checkout this run targeted at fire time, snapshot from the schedule when the run
   * row is created. Kept independent of the schedule so a later edit does not rewrite this run's
   * history; set to null if the checkout is subsequently deleted (`resolvedCwd` still records where
   * the run happened). Null for legacy runs and for the explicit-cwd/WORKSPACE_ROOT fallback.
   */
  @Column({ name: 'repository_checkout_id', nullable: true, type: 'uuid' })
  repositoryCheckoutId!: string | null;

  /**
   * The exact directory the agent CLI was spawned in, after the checkout -> cwd -> WORKSPACE_ROOT ->
   * process.cwd() precedence and `toContainerPath`. The authoritative record of where the run
   * actually executed; null for legacy rows created before this column existed.
   */
  @Column({ name: 'resolved_cwd', nullable: true, type: 'text' })
  resolvedCwd!: string | null;

  /**
   * The usage_limited run this run continues (trigger `resume`); null for every ordinary run. A
   * partial UNIQUE index allows at most one continuation per limited run — the idempotency anchor —
   * and walking it backwards bounds how many times a job is auto-resumed.
   */
  @Column({ name: 'resume_of_run_id', nullable: true, type: 'uuid' })
  resumeOfRunId!: string | null;

  /** The owning schedule's id; a plain column, so a soft-deleted schedule keeps its runs. */
  @Column({ name: 'scheduled_agent_job_id', type: 'uuid' })
  scheduledAgentJobId!: string;

  /**
   * The cron slot a `schedule`-trigger run belongs to, missed rows included (migration 141). Unique
   * per (scheduledAgentJobId, scheduledFor) among schedule-trigger rows, so a slot is claimed at most
   * once. Null for manual/resume runs and for runs recorded before 141.
   */
  @Column({
    name: 'scheduled_for',
    nullable: true,
    type: 'timestamp with time zone',
  })
  scheduledFor!: Date | null;

  @Column({
    name: 'started_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  startedAt!: Date | null;

  @Column({ default: 'queued', name: 'status', type: 'text' })
  status!: ScheduledAgentJobRunStatus;

  @Column({ default: 'schedule', name: 'trigger', type: 'text' })
  trigger!: ScheduledAgentJobRunTrigger;

  /** When the usage limit that stopped this run lifts, per the agent CLI; null when unreported. */
  @Column({
    name: 'usage_limit_resets_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  usageLimitResetsAt!: Date | null;

  /** Raw usage-limit window name (five_hour, seven_day, ...); null when unreported. */
  @Column({ name: 'usage_limit_type', nullable: true, type: 'text' })
  usageLimitType!: string | null;
}
