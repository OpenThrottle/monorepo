/**
 * @description TypeORM entity for the scheduled_agent_jobs table (databases/openthrottle/migrations/082, 096,
 * 141, 142): a user-defined "run a prompt with a driver/model/settings on a schedule" job — a cron
 * pattern, an interval, or a single run. The DB row is
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
  | 'antigravity'
  | 'claude'
  | 'codex'
  | 'cursor'
  | 'gemini'
  | 'grok'
  | 'opencode';

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

/**
 * What happens to a cron fire that starts more than `misfireThresholdMs` after its slot (migration
 * 141): `skip` records it as a `missed` run; `catch_up_once` runs the most recent late fire once and
 * records any earlier ones as `missed`. A fire within the threshold always runs.
 */
export const SCHEDULED_AGENT_JOB_MISFIRE_POLICIES = [
  'catch_up_once',
  'skip',
] as const;

export type ScheduledAgentJobMisfirePolicy =
  (typeof SCHEDULED_AGENT_JOB_MISFIRE_POLICIES)[number];

/**
 * How a schedule fires (migration 142): `cron` (a pattern in a timezone; the default), `interval`
 * (elapsed time after the previous fire finishes), or `once` (a single fire at `runAt`).
 */
export const SCHEDULED_AGENT_JOB_SCHEDULE_KINDS = [
  'cron',
  'interval',
  'once',
] as const;

export type ScheduledAgentJobScheduleKind =
  (typeof SCHEDULED_AGENT_JOB_SCHEDULE_KINDS)[number];

/** Scalar/column fields of ScheduledAgentJob surfaced to the API. */
export type ScheduledAgentJobData = Pick<
  ScheduledAgentJob,
  | 'createdAt'
  | 'cronPattern'
  | 'cwd'
  | 'driverId'
  | 'enabled'
  | 'id'
  | 'intervalMs'
  | 'lastRunAt'
  | 'misfirePolicy'
  | 'misfireThresholdMs'
  | 'model'
  | 'name'
  | 'nextRunAt'
  | 'ownerUserId'
  | 'prompt'
  | 'repositoryCheckoutId'
  | 'runAt'
  | 'scheduleKind'
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

  /**
   * 5- or 6-field cron pattern, validated on write; interpreted in `timezone` or UTC. Set exactly
   * when `scheduleKind` is `cron`; null for interval and once schedules.
   */
  @Column({ name: 'cron_pattern', nullable: true, type: 'text' })
  cronPattern!: string | null;

  /**
   * Legacy/explicit process cwd for the agent CLI, used only when `repositoryCheckoutId` is null;
   * null then falls back to WORKSPACE_ROOT ?? process.cwd(). Deprecated in favour of targeting a
   * registered checkout — see the precedence ladder on `resolveScheduledAgentJobCwd`.
   */
  @Column({ name: 'cwd', nullable: true, type: 'text' })
  cwd!: string | null;

  @Column({ name: 'driver_id', type: 'text' })
  driverId!: ScheduledAgentJobDriverId;

  @Column({ default: true, name: 'enabled', type: 'boolean' })
  enabled!: boolean;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * For `interval` schedules: elapsed ms from the end of one fire to the start of the next (>= 60000).
   * Null for other kinds.
   */
  @Column({ name: 'interval_ms', nullable: true, type: 'integer' })
  intervalMs!: number | null;

  /** Last time a run started; refreshed by the processor after each fire. */
  @Column({
    name: 'last_run_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  lastRunAt!: Date | null;

  /** Misfire policy for late cron fires (migration 141); see {@link ScheduledAgentJobMisfirePolicy}. */
  @Column({ default: 'skip', name: 'misfire_policy', type: 'text' })
  misfirePolicy!: ScheduledAgentJobMisfirePolicy;

  /** How late (ms past its slot) a fire may start and still run; >= 60000, default 10 minutes. */
  @Column({ default: 600_000, name: 'misfire_threshold_ms', type: 'integer' })
  misfireThresholdMs!: number;

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

  /**
   * The registered repository checkout this schedule runs in; resolved server-side to a cwd from the
   * checkout's `filesystemPath` (container-path aware) and ownership-checked against `ownerUserId`.
   * Null means the legacy explicit `cwd` or the WORKSPACE_ROOT fallback applies instead.
   */
  @Column({ name: 'repository_checkout_id', nullable: true, type: 'uuid' })
  repositoryCheckoutId!: string | null;

  /** For `once` schedules: the instant the single fire is due. Null for other kinds. */
  @Column({ name: 'run_at', nullable: true, type: 'timestamp with time zone' })
  runAt!: Date | null;

  /** How the schedule fires (migration 142); see {@link ScheduledAgentJobScheduleKind}. */
  @Column({ default: 'cron', name: 'schedule_kind', type: 'text' })
  scheduleKind!: ScheduledAgentJobScheduleKind;

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
