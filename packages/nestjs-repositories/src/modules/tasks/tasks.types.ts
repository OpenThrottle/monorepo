import type { TaskHookScope, TaskHookSource } from './task.entity.ts';
import type { Task } from './task.entity.ts';
/** Side of an anchor a hook/task is allocated on. */
export type HookAdjacencySide = 'after' | 'before';

/**
 * @description Per-item shape for {@link TasksService.createTasksBatch}. Mirrors the columns the
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
