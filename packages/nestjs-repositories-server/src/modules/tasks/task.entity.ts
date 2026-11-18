/**
 * @description TypeORM entity for the openthrottle `tasks` table. Extends `BaseModel`, so a
 * delete is a soft delete (`TasksRepository.remove` also soft-deletes the task's child tasks).
 * `(plan_id, sort_order)` is unique among live tasks only. Matches
 * databases/openthrottle/migrations (003, 012, 015, 023, 049, 055, 071, 126, 173).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import {
  PLAN_STATUS,
  PLAN_STATUS_VALUES,
} from '../../plan-task-status/plan-task-status.constants.ts';
import type { Plan } from '../plans/plan.entity.ts';
import type { Project } from '../projects/project.entity.ts';
import type { TaskEmbedding } from '../task-embeddings/task-embedding.entity.ts';
import type {
  TaskHookRole,
  TaskHookScope,
  TaskHookSource,
} from './tasks.types.ts';

@Entity('tasks')
export class Task extends BaseModel {
  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @Column({ name: 'title', type: 'text' })
  title!: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  @Column({ name: 'category', nullable: true, type: 'text' })
  category!: string | null;

  /**
   * @description The `plan_task_status` Postgres enum (databases/openthrottle/migrations 028,
   * 029). Tasks never take QUEUED (plans-only), but the column shares the same DB
   * enum type. Typed as the shared SSOT enum rather than free text; default
   * matches the migration (`PENDING`, uppercase).
   */
  @Column({
    default: PLAN_STATUS.PENDING,
    enum: [...PLAN_STATUS_VALUES],
    enumName: 'plan_task_status',
    name: 'status',
    type: 'enum',
  })
  status!: string;

  @Column({ default: () => "'[]'::jsonb", name: 'requirements', type: 'jsonb' })
  requirements!: unknown[];

  @Column({ name: 'sort_order', type: 'integer' })
  sortOrder!: number;

  /**
   * @description Coarse concurrency layer within a plan. NULL means unassigned
   * (runs alone, in sortOrder position) -- never wave zero (migration 126
   * enforces `wave IS NULL OR wave >= 1`). Tasks sharing a wave are the
   * author's claim that they may be worked concurrently; sortOrder remains
   * canonical and is the tiebreaker within a wave. Hook tasks always stay
   * NULL. Not consumed for execution yet -- see
   * docs/openthrottle/task-wave-encoding.md.
   */
  @Column({ name: 'wave', nullable: true, type: 'integer' })
  wave!: number | null;

  @Column({ name: 'assignee', nullable: true, type: 'text' })
  assignee!: string | null;

  @Column({ name: 'summary', nullable: true, type: 'text' })
  summary!: string | null;

  @Column({ name: 'project', nullable: true, type: 'text' })
  project!: string | null;

  @Column({ name: 'project_id', nullable: true, type: 'uuid' })
  projectId!: string | null;

  /**
   * @description Anchor task for a task-level lifecycle hook (self-FK). NULL for
   * regular tasks and plan-level hooks. See migration 071.
   */
  @Column({ name: 'parent_task_id', nullable: true, type: 'uuid' })
  parentTaskId!: string | null;

  /**
   * @description Lifecycle-hook marker: NULL = regular task; 'before'/'after' =
   * hook task (plan-level when parentTaskId is NULL, per-task otherwise).
   */
  @Column({ name: 'hook_role', nullable: true, type: 'text' })
  hookRole!: TaskHookRole | null;

  /**
   * @description Plan-level hook expansion mode ('once' | 'each'); only set when
   * parentTaskId is NULL. NULL for regular tasks and task-level hooks.
   */
  @Column({ name: 'hook_scope', nullable: true, type: 'text' })
  hookScope!: TaskHookScope | null;

  /**
   * @description How a hook task's body is produced ('template' | 'skill'). NULL
   * for regular tasks.
   */
  @Column({ name: 'hook_source', nullable: true, type: 'text' })
  hookSource!: TaskHookSource | null;

  /**
   * @description Skill slug when hookSource is 'skill'; NULL otherwise.
   */
  @Column({ name: 'skill_slug', nullable: true, type: 'text' })
  skillSlug!: string | null;

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

  @ManyToOne('Plan', 'tasks', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;

  @ManyToOne('Project', 'tasks', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  projectRelation!: Project | null;

  @OneToMany('TaskEmbedding', 'task')
  taskEmbeddings!: TaskEmbedding[];

  /** Anchor task this hook belongs to (task-level hooks only). */
  @ManyToOne('Task', 'hookChildren', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_task_id' })
  parentTask!: Task | null;

  /** Task-level before/after hooks anchored to this task. */
  @OneToMany('Task', 'parentTask')
  hookChildren!: Task[];
}
