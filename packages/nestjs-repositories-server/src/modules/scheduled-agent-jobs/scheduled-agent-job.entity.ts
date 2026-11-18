/**
 * @description TypeORM entity for the scheduled_agent_jobs table (databases/openthrottle/migrations/082, 096,
 * 141, 142, 178): a user-defined "run a prompt with a driver/model/settings on a schedule" job — a cron
 * pattern, an interval, or a single run. The DB row is
 * authoritative; a BullMQ repeatable scheduler keyed by `schedulerKey` is a projection reconciled
 * from it. Extends `BaseModel`: a deleted schedule is soft deleted, and `scheduler_key` is unique
 * among live rows only (migration 178). See docs/monorepo/scheduled-agent-jobs-design.md.
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity } from 'typeorm';

import type {
  ScheduledAgentJobDriverId,
  ScheduledAgentJobMisfirePolicy,
  ScheduledAgentJobScheduleKind,
  ScheduledAgentJobSettings,
} from './scheduled-agent-jobs.types.ts';

@Entity('scheduled_agent_jobs')
export class ScheduledAgentJob extends BaseModel {
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

  /** Stable BullMQ upsertJobScheduler id (scheduled-job:<id>); unique among live rows. */
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
}
