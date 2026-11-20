/**
 * @description TypeORM entity for the openthrottle `plans` table. Extends `BaseModel`, so a
 * delete is a soft delete (`PlansRepository.remove` also soft-deletes the plan's tasks).
 * Matches databases/openthrottle/migrations (002, 012, 014, 022, 055, 173, 185).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import type {
  PlanJobRunHooksStorage,
  PlanRunConfigStorage,
} from '@openthrottle/openthrottle-plan-config';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import {
  PLAN_STATUS,
  PLAN_STATUS_VALUES,
} from '../../plan-task-status/plan-task-status.constants.ts';
import type { PlanEmbedding } from '../plan-embeddings/plan-embedding.entity.ts';
import type { PlanOutputStreamChunk } from '../plan-output-stream/plan-output-stream-chunk.entity.ts';
import type { Project } from '../projects/project.entity.ts';
import type { Task } from '../tasks/task.entity.ts';

@Entity('plans')
export class Plan extends BaseModel {
  @Column({ name: 'title', type: 'text' })
  title!: string;

  @Column({ name: 'author', type: 'text' })
  author!: string;

  @Column({ name: 'category', type: 'text' })
  category!: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  /**
   * @description The `plan_task_status` Postgres enum (databases/openthrottle/migrations 028,
   * 029). QUEUED is plans-only. Typed as the shared SSOT enum rather than free
   * text so the ORM metadata matches the DB; default matches the migration
   * (`PENDING`, uppercase).
   */
  @Column({
    default: PLAN_STATUS.PENDING,
    enum: [...PLAN_STATUS_VALUES],
    enumName: 'plan_task_status',
    name: 'status',
    type: 'enum',
  })
  status!: string;

  @Column({ name: 'assignee', nullable: true, type: 'text' })
  assignee!: string | null;

  @Column({ name: 'summary', nullable: true, type: 'text' })
  summary!: string | null;

  @Column({ name: 'project', nullable: true, type: 'text' })
  project!: string | null;

  @Column({ name: 'project_id', nullable: true, type: 'uuid' })
  projectId!: string | null;

  /**
   * @description Gap-based position within the project (1000, 2000, …); null exactly when
   * `projectId` is null. Unique per project among live plans (migration 185).
   */
  @Column({ name: 'project_sort_order', nullable: true, type: 'int' })
  projectSortOrder!: number | null;

  @Column({
    default: () => '\'{"hooks":[]}\'::jsonb',
    name: 'job_run_hooks',
    type: 'jsonb',
  })
  jobRunHooks!: PlanJobRunHooksStorage;

  /** @description Stored shape for `plans.run_config` (validated in openthrottle-server). */
  @Column({
    default: () => '\'{"version":1}\'::jsonb',
    name: 'run_config',
    type: 'jsonb',
  })
  runConfig!: PlanRunConfigStorage;

  /**
   * @description Set once on transition into COMPLETED; cleared if status leaves COMPLETED.
   * Not maintained by DB updated_at triggers — see migration 055.
   */
  @Column({
    name: 'completed_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  completedAt!: Date | null;

  @ManyToOne('Project', 'plans', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  projectRelation!: Project | null;

  @OneToMany('Task', 'plan')
  tasks!: Task[];

  @OneToMany('PlanEmbedding', 'plan')
  planEmbeddings!: PlanEmbedding[];

  @OneToMany('PlanOutputStreamChunk', 'plan')
  planOutputChunks!: PlanOutputStreamChunk[];
}
