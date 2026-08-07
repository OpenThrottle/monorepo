/**
 * @description TypeORM entity for the scheduled_agent_jobs table (databases/migrations/082): a
 * user-defined "run a prompt with a driver/model/settings on a cron schedule" job. The DB row is
 * authoritative; a BullMQ repeatable scheduler keyed by `schedulerKey` is a projection reconciled
 * from it. See docs/monorepo/scheduled-agent-jobs-design.md.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Agent-CLI driver id for a scheduled job. Kept in lockstep with the `openthrottle-drivers`
 * `DRIVER_IDS` set but declared standalone so the repositories layer stays decoupled from the
 * CLI-invocation package (same pattern as `PlanRunExecutionBackend`). Stored as text and validated
 * app-side via `parseDriverId`, not CHECK-constrained, because the driver set grows.
 */
export type ScheduledAgentJobDriverId =
  'claude' | 'codex' | 'cursor' | 'grok' | 'opencode';

/** Local endpoint targeting persisted in `settings` — mirrors DriverEndpointConfig WITHOUT apiKey (never persisted). */
export interface ScheduledAgentJobEndpointSettings {
  readonly baseUrl: string;
  readonly configFilePath?: string;
  readonly provider?: 'lmstudio' | 'ollama' | null;
}

/** Worktree options persisted in `settings` — mirrors DriverWorktreeOptions. */
export interface ScheduledAgentJobWorktreeSettings {
  readonly skipWorktreeSetup?: boolean;
  readonly worktree?: string;
  readonly worktreeBase?: string;
}

/**
 * The exact typed subset persisted in `settings` (NOT a free-form JSON bag). Mirrors the drivers
 * package `AgentPromptSettings`; unknown keys are rejected on write and `endpoint.apiKey` is
 * disallowed.
 */
export interface ScheduledAgentJobSettings {
  readonly endpoint?: ScheduledAgentJobEndpointSettings;
  readonly worktree?: ScheduledAgentJobWorktreeSettings;
}

/** Scalar/column fields of ScheduledAgentJob surfaced to the API. */
export type ScheduledAgentJobData = Pick<
  ScheduledAgentJob,
  | 'createdAt'
  | 'cronPattern'
  | 'cwd'
  | 'driverId'
  | 'enabled'
  | 'id'
  | 'lastRunAt'
  | 'model'
  | 'name'
  | 'nextRunAt'
  | 'ownerUserId'
  | 'prompt'
  | 'schedulerKey'
  | 'settings'
  | 'timeoutMs'
  | 'timezone'
  | 'updatedAt'
>;

@Entity('scheduled_agent_jobs')
export class ScheduledAgentJob {
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  /** 5- or 6-field cron pattern, validated on write; interpreted in `timezone` or UTC. */
  @Column({ name: 'cron_pattern', type: 'text' })
  cronPattern!: string;

  /** Process cwd for the agent CLI; null falls back to WORKSPACE_ROOT ?? process.cwd(). */
  @Column({ name: 'cwd', nullable: true, type: 'text' })
  cwd!: string | null;

  @Column({ name: 'driver_id', type: 'text' })
  driverId!: ScheduledAgentJobDriverId;

  @Column({ default: true, name: 'enabled', type: 'boolean' })
  enabled!: boolean;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Last time a run started; refreshed by the processor after each fire. */
  @Column({
    name: 'last_run_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  lastRunAt!: Date | null;

  /** Model preset; null uses the driver default. */
  @Column({ name: 'model', nullable: true, type: 'text' })
  model!: string | null;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  /** Next fire time read back from the BullMQ scheduler; advisory cache. */
  @Column({
    name: 'next_run_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  nextRunAt!: Date | null;

  /** User who owns this schedule; null for system-seeded rows. */
  @Column({ name: 'owner_user_id', nullable: true, type: 'uuid' })
  ownerUserId!: string | null;

  @Column({ name: 'prompt', type: 'text' })
  prompt!: string;

  /** Stable BullMQ upsertJobScheduler id (scheduled-job:<id>); unique. */
  @Column({ name: 'scheduler_key', type: 'text' })
  schedulerKey!: string;

  /** Typed subset applied to the driver (endpoint/worktree); never an arbitrary bag. */
  @Column({ default: {}, name: 'settings', type: 'jsonb' })
  settings!: ScheduledAgentJobSettings;

  /** Per-job worker-layer timeout override (ms); null uses the queue default. */
  @Column({ name: 'timeout_ms', nullable: true, type: 'integer' })
  timeoutMs!: number | null;

  /** IANA timezone for the cron pattern; null means UTC. */
  @Column({ name: 'timezone', nullable: true, type: 'text' })
  timezone!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
