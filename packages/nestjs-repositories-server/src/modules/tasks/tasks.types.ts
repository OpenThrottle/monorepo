import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { Task } from './task.entity.ts';
import type { TasksRepository } from './tasks.repository.ts';

/** Lifecycle-hook role marker: NULL = regular task; 'before'/'after' = hook task. */
export type TaskHookRole = 'after' | 'before';

/** Plan-level hook expansion mode: 'once' = beforeAll/afterAll, 'each' = beforeEach/afterEach. */
export type TaskHookScope = 'each' | 'once';

/** How a hook task's body is produced: inline template or a referenced skill. */
export type TaskHookSource = 'skill' | 'template';

/**
 * Scalar/column fields of Task (no relations, no `deletedAt`). Use this to type GraphQL
 * objects or DTOs that mirror the entity.
 * @public
 */
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
  | 'wave'
>;

/** Side of an anchor a hook/task is allocated on. */
export type HookAdjacencySide = 'after' | 'before';

/**
 * @description Per-item shape for {@link TasksRepository.createTasksBatch}. Mirrors the columns the
 * single-create path writes; requirements is already parsed and status already normalized by the caller.
 */
export interface CreateTaskBatchItem {
  assignee: string | null;
  category: string | null;
  description: string | null;
  project: string | null;
  projectId: string | null;
  requirements: unknown[];
  sortOrder: number | null;
  status: string;
  summary: string | null;
  title: string;
  wave: number | null;
}

/**
 * @description Input for {@link TasksRepository.countByDateRange}: counts live tasks whose
 * `column` falls in `[dayStart, dayEnd)`.
 * @public
 */
export interface CountTasksByDateRangeParams {
  readonly column: 'completedAt' | 'createdAt' | 'updatedAt';
  readonly dayEnd: Date;
  readonly dayStart: Date;
}

/**
 * @description Input for {@link TasksRepository.getNeighborSortOrder}: the live task of
 * `planId` nearest `anchorSortOrder` on `side`, not counting `excludeTaskId`.
 * @public
 */
export interface NeighborSortOrderParams {
  readonly anchorSortOrder: number;
  readonly excludeTaskId: string;
  readonly planId: string;
  readonly side: HookAdjacencySide;
}

/**
 * @description Attach-a-hook input. `source='skill'` requires `skillSlug`;
 * `source='template'` uses `title`/`description`. `scope` is honored only for
 * plan-level hooks (anchorTaskId omitted) and defaults to 'once'.
 */
export interface HookTaskInput {
  readonly description?: string | null;
  readonly scope?: TaskHookScope;
  readonly skillSlug?: string | null;
  readonly source: TaskHookSource;
  readonly title?: string | null;
}

/** A parent (plan or task) with its before/after hook tasks (one level). */
export interface GroupedHooks {
  readonly after: Task[];
  readonly before: Task[];
}

type TaskRelationKeys =
  'hookChildren' | 'parentTask' | 'plan' | 'projectRelation' | 'taskEmbeddings';

type TaskDefaultedKeys =
  | 'assignee'
  | 'category'
  | 'completedAt'
  | 'description'
  | 'hookRole'
  | 'hookScope'
  | 'hookSource'
  | 'parentTaskId'
  | 'project'
  | 'projectId'
  | 'requirements'
  | 'skillSlug'
  | 'status'
  | 'summary'
  | 'wave';

/**
 * @description What `TasksRepository.create` takes: the task's columns, with the relations left
 * out and the nullable and database-defaulted columns optional. `planId`, `title` and
 * `sortOrder` are required.
 * @public
 */
export interface TaskCreateInput
  extends
    Omit<CreateModelInput<Task>, TaskDefaultedKeys | TaskRelationKeys>,
    Partial<Pick<CreateModelInput<Task>, TaskDefaultedKeys>> {}

/**
 * @description A {@link TasksRepository} mock: every inherited `BaseRepository` method plus the
 * task ones.
 * @public
 */
export interface TasksRepositoryMock extends BaseRepositoryMock<
  Task,
  TaskCreateInput
> {
  readonly addAfterHook: Mock<TasksRepository['addAfterHook']>;
  readonly addBeforeHook: Mock<TasksRepository['addBeforeHook']>;
  readonly allocateSortOrderBesideAnchor: Mock<
    TasksRepository['allocateSortOrderBesideAnchor']
  >;
  readonly countByDateRange: Mock<TasksRepository['countByDateRange']>;
  readonly countByPlanIds: Mock<TasksRepository['countByPlanIds']>;
  readonly countByProjectId: Mock<TasksRepository['countByProjectId']>;
  readonly createTasksBatch: Mock<TasksRepository['createTasksBatch']>;
  readonly detachHook: Mock<TasksRepository['detachHook']>;
  readonly findByIdPrefix: Mock<TasksRepository['findByIdPrefix']>;
  readonly findFirstByTitleContaining: Mock<
    TasksRepository['findFirstByTitleContaining']
  >;
  readonly findFirstMentioning: Mock<TasksRepository['findFirstMentioning']>;
  readonly getNeighborSortOrder: Mock<TasksRepository['getNeighborSortOrder']>;
  readonly getPlanHooks: Mock<TasksRepository['getPlanHooks']>;
  readonly getPlanHooksForPlans: Mock<TasksRepository['getPlanHooksForPlans']>;
  readonly getSortOrderExtent: Mock<TasksRepository['getSortOrderExtent']>;
  readonly getTaskHooks: Mock<TasksRepository['getTaskHooks']>;
  readonly hasRemainingTasks: Mock<TasksRepository['hasRemainingTasks']>;
  readonly rebalancePlanSortOrders: Mock<
    TasksRepository['rebalancePlanSortOrders']
  >;
  readonly reorderInPlan: Mock<TasksRepository['reorderInPlan']>;
  readonly resolveNextSortOrder: Mock<TasksRepository['resolveNextSortOrder']>;
}
