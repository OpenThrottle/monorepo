/**
 * @description TypeORM entity for OpenThrottle tasks table. Matches databases/migrations (003, 012, 015, 023, 049, 055, 071).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { CommitLink } from '../commit-links/commit-link.entity';
import type { Plan } from '../plans/plan.entity';
import type { Project } from '../projects/project.entity';
import type { TaskEmbedding } from '../task-embeddings/task-embedding.entity';

/** Lifecycle-hook role marker: NULL = regular task; 'before'/'after' = hook task. */
export type TaskHookRole = 'after' | 'before';

/** Plan-level hook expansion mode: 'once' = beforeAll/afterAll, 'each' = beforeEach/afterEach. */
export type TaskHookScope = 'each' | 'once';

/** How a hook task's body is produced: inline template or a referenced skill. */
export type TaskHookSource = 'skill' | 'template';

/** Scalar/column fields of Task (no relations). Use this to type GraphQL objects or DTOs that mirror the entity. */
export type TaskData = Pick<
  Task,
  | 'assignee'
  | 'category'
  | 'completedAt'
  | 'createdAt'
  | 'description'
  | 'hookRole'
  | 'hookScope'
  | 'hookSource'
  | 'id'
  | 'parentTaskId'
  | 'planId'
  | 'project'
  | 'projectId'
  | 'requirements'
  | 'skillSlug'
  | 'sortOrder'
  | 'status'
  | 'summary'
  | 'title'
  | 'updatedAt'
>;

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @Column({ name: 'title', type: 'text' })
  title!: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  @Column({ name: 'category', nullable: true, type: 'text' })
  category!: string | null;

  @Column({ default: 'pending', name: 'status', type: 'text' })
  status!: string;

  @Column({ default: () => "'[]'::jsonb", name: 'requirements', type: 'jsonb' })
  requirements!: unknown[];

  @Column({ name: 'sort_order', type: 'integer' })
  sortOrder!: number;

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne('Plan', 'tasks', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;

  @ManyToOne('Project', 'tasks', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  projectRelation!: Project | null;

  @OneToMany('TaskEmbedding', 'task')
  taskEmbeddings!: TaskEmbedding[];

  @OneToMany('CommitLink', 'task')
  commitLinks!: CommitLink[];

  /** Anchor task this hook belongs to (task-level hooks only). */
  @ManyToOne('Task', 'hookChildren', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_task_id' })
  parentTask!: Task | null;

  /** Task-level before/after hooks anchored to this task. */
  @OneToMany('Task', 'parentTask')
  hookChildren!: Task[];
}
