/**
 * @description TypeORM entity for OpenThrottle plan_runs table. Matches databases/migrations/038.
 */

import type { PlanRunConfigSnapshot } from '../plans/plan-run-config/plan-run-config-snapshot.types';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export type PlanRunKind = 'orchestrator' | 'spawn';
export type PlanRunExecutionBackend = 'claude' | 'cursor' | 'opencode';

/** Scalar/column fields of PlanRun (no relations). */
export type PlanRunData = Pick<
  PlanRun,
  | 'bullmqJobId'
  | 'createdAt'
  | 'executionBackend'
  | 'id'
  | 'planId'
  | 'queueName'
  | 'runKind'
  | 'status'
  | 'updatedAt'
>;

@Entity('plan_runs')
@Unique('plan_runs_queue_job_unique', ['queueName', 'bullmqJobId'])
export class PlanRun {
  /** User who enqueued this run (null for service-account/system runs or legacy rows). */
  @Column({ name: 'actor_user_id', nullable: true, type: 'uuid' })
  actorUserId!: string | null;

  @Column({ name: 'bullmq_job_id', type: 'text' })
  bullmqJobId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({ default: 'cursor', name: 'execution_backend', type: 'text' })
  executionBackend!: PlanRunExecutionBackend;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

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
}
