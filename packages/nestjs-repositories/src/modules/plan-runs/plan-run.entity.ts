/**
 * @description TypeORM entity for OpenThrottle plan_runs table. Matches databases/migrations/038 (+ 047, 053, 076).
 */

import type { PlanRunConfigSnapshot } from '@openthrottle/openthrottle-plan-config';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PlanRunKind = 'orchestrator' | 'spawn';
/**
 * Supported agent-CLI backends for a plan run. Kept in lockstep with the
 * `openthrottle-drivers` `DRIVER_IDS` set and the `plan_runs_execution_backend_check`
 * constraint (see databases/migrations/079). Declared as a standalone union so the
 * repositories layer stays decoupled from the CLI-invocation package.
 */
export type PlanRunExecutionBackend =
  | 'claude'
  | 'codex'
  | 'cursor'
  | 'grok'
  | 'opencode';

/** Scalar/column fields of PlanRun (no relations) surfaced to the API. */
export type PlanRunData = Pick<
  PlanRun,
  | 'bullmqJobId'
  | 'cancelRequestedAt'
  | 'createdAt'
  | 'executionBackend'
  | 'hostname'
  | 'id'
  | 'lastHeartbeatAt'
  | 'pid'
  | 'planId'
  | 'queueName'
  | 'runKind'
  | 'status'
  | 'updatedAt'
  | 'workerId'
>;

/**
 * Uniqueness on (queue_name, bullmq_job_id) is enforced by the PARTIAL unique
 * index `plan_runs_queue_job_unique_idx ... WHERE bullmq_job_id IS NOT NULL`
 * (migration 076). It is intentionally NOT declared here via `@Unique`/`@Index`
 * because TypeORM cannot express a partial index predicate; the migration owns
 * it so detached-CLI rows (bullmqJobId NULL) can coexist.
 */
@Entity('plan_runs')
export class PlanRun {
  /** User who enqueued this run (null for service-account/system runs or legacy rows). */
  @Column({ name: 'actor_user_id', nullable: true, type: 'uuid' })
  actorUserId!: string | null;

  /** BullMQ job id; null for detached-CLI runs that carry no queue job. */
  @Column({ name: 'bullmq_job_id', nullable: true, type: 'text' })
  bullmqJobId!: string | null;

  /**
   * Durable cancel-request marker (Channel 1): set by cancelRun, polled by the
   * run loop at each iteration boundary. Null when no cancel was requested.
   */
  @Column({
    name: 'cancel_requested_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  cancelRequestedAt!: Date | null;

  /** User (auth sub) who requested cancellation; null for system cancels or none. */
  @Column({ name: 'cancel_requested_by', nullable: true, type: 'uuid' })
  cancelRequestedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({ default: 'cursor', name: 'execution_backend', type: 'text' })
  executionBackend!: PlanRunExecutionBackend;

  /** Host the executing worker is on; populated at job start, cleared at finish. Null when not actively executing. */
  @Column({ name: 'hostname', nullable: true, type: 'text' })
  hostname!: string | null;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Liveness heartbeat: bumped by the owning run process (~every 15s) while
   * executing and stamped at run start. An IN_PROGRESS row whose heartbeat is
   * older than the staleness cutoff is treated as dead (see migration 080).
   * Dedicated column rather than reusing updatedAt (an @UpdateDateColumn bumped
   * by unrelated writes -> false liveness). Null for legacy / never-started rows.
   */
  @Column({
    name: 'last_heartbeat_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  lastHeartbeatAt!: Date | null;

  /** OS process id of the executing worker; populated at job start, cleared at finish. Null when not actively executing. */
  @Column({ name: 'pid', nullable: true, type: 'integer' })
  pid!: number | null;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @Column({ default: 'plans', name: 'queue_name', type: 'text' })
  queueName!: string;

  @Column({ default: 'spawn', name: 'run_kind', type: 'text' })
  runKind!: PlanRunKind;

  /** @description Resolved enqueue configuration (PlanRunConfigSnapshot v1). Null for legacy rows. */
  @Column({ name: 'run_config_snapshot', nullable: true, type: 'jsonb' })
  runConfigSnapshot!: PlanRunConfigSnapshot | null;

  @Column({ default: 'QUEUED', name: 'status', type: 'text' })
  status!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  /** Identifier of the executing worker instance (BullMQ worker id); cleared at finish. Null when not actively executing. */
  @Column({ name: 'worker_id', nullable: true, type: 'text' })
  workerId!: string | null;
}
