/**
 * @description TypeORM entity for the openthrottle `project_runs` table: one run of a project,
 * which enqueues the project's plans one after another and stops on the first that does not
 * finish. A run is history written in place, so it extends `BaseHardDeleteModel` and declares
 * its own `updated_at`. Matches databases/openthrottle/migrations (194).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, UpdateDateColumn } from 'typeorm';

import type { ProjectRunStatus } from './project-runs.types.ts';

/**
 * At most one active run per project is enforced by the PARTIAL unique index
 * `uq_project_runs_one_active_per_project ... WHERE status IN ('QUEUED','IN_PROGRESS')`
 * (migration 194), which TypeORM cannot express, so the migration owns it.
 */
@Entity('project_runs')
export class ProjectRun extends BaseHardDeleteModel {
  /** User who started the run; null for service-account or system runs. */
  @Column({ name: 'actor_user_id', nullable: true, type: 'uuid' })
  actorUserId!: string | null;

  @Column({
    name: 'cancel_requested_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  cancelRequestedAt!: Date | null;

  @Column({ name: 'cancel_requested_by', nullable: true, type: 'uuid' })
  cancelRequestedBy!: string | null;

  /** The plan the run is on now, or the last one it was on once settled. */
  @Column({ name: 'current_plan_id', nullable: true, type: 'uuid' })
  currentPlanId!: string | null;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({
    name: 'settled_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  settledAt!: Date | null;

  @Column({
    name: 'started_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  startedAt!: Date | null;

  @Column({ default: 'QUEUED', name: 'status', type: 'text' })
  status!: ProjectRunStatus;

  /** For a STOPPED run, the plan that stopped it; a fresh run resumes there. */
  @Column({ name: 'stopped_by_plan_id', nullable: true, type: 'uuid' })
  stoppedByPlanId!: string | null;

  @Column({ name: 'stopped_reason', nullable: true, type: 'text' })
  stoppedReason!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
