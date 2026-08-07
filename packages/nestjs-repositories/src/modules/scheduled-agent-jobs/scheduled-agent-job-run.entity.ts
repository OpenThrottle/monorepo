/**
 * @description TypeORM entity for the scheduled_agent_job_runs table (databases/migrations/082): the
 * append-only run history (status/timing/exit) for a scheduled_agent_jobs row. Run *logs* are not
 * here — they stream to the JSONL sink (queueJobLogs/queueJobLogTail), joined by `bullmqJobId`.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ScheduledAgentJobDriverId } from './scheduled-agent-job.entity';

/** queued (pre-created by run-now) -> running (claimed) -> succeeded | failed | cancelled. */
export type ScheduledAgentJobRunStatus =
  'cancelled' | 'failed' | 'queued' | 'running' | 'succeeded';

/** schedule = cron fire; manual = run-now. */
export type ScheduledAgentJobRunTrigger = 'manual' | 'schedule';

/**
 * Effective run settings captured on the run row at execution time, so later edits
 * to the parent schedule don't rewrite this run's history. A denormalized snapshot
 * of the driver/model/reasoning-tier/permission-mode/run-config in force at fire time.
 */
export interface ScheduledAgentJobRunSettingsSnapshot {
  readonly [key: string]: unknown;
}

/** Scalar/column fields of ScheduledAgentJobRun surfaced to the API. */
export type ScheduledAgentJobRunData = Pick<
  ScheduledAgentJobRun,
  | 'bullmqJobId'
  | 'cacheReadTokens'
  | 'cacheWriteTokens'
  | 'cancelRequestedAt'
  | 'costUsd'
  | 'createdAt'
  | 'driverId'
  | 'errorMessage'
  | 'exitCode'
  | 'finishedAt'
  | 'id'
  | 'inputTokens'
  | 'model'
  | 'outputTokens'
  | 'rawUsage'
  | 'reasoningTokens'
  | 'scheduledAgentJobId'
  | 'settingsSnapshot'
  | 'startedAt'
  | 'status'
  | 'totalTokens'
  | 'trigger'
>;

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
export class ScheduledAgentJobRun {
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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

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

  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  @Column({ name: 'scheduled_agent_job_id', type: 'uuid' })
  scheduledAgentJobId!: string;

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
}
