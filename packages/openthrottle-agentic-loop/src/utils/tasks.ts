import type { LoopOutcome, LoopTask } from '../contract/index.ts';
import { LOOP_TASK_STATUS } from '../contract/index.ts';
import { THIN_TASK_MIN_CHARS } from '../data/data.constants.ts';

/** @description Task-centric mode narrows the plan's tasks to the one task; otherwise all of them. */
const scopeTasks = (
  tasks: readonly LoopTask[],
  onlyTaskId: string | undefined,
): readonly LoopTask[] => {
  if (onlyTaskId === undefined) {
    return tasks;
  }

  return tasks.filter((task) => task.id === onlyTaskId);
};

const compareTasks = (a: LoopTask, b: LoopTask): number => {
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }

  return a.createdAt.localeCompare(b.createdAt);
};

const lowest = (tasks: readonly LoopTask[]): LoopTask | undefined => {
  return [...tasks].sort(compareTasks)[0];
};

/**
 * @description Selects the next task: the lowest-`sortOrder` `IN_PROGRESS` task (resume), else the
 * lowest `PENDING`/`QUEUED` one; ties break by `createdAt`. With `onlyTaskId`, only that task is
 * considered (task-centric mode).
 * @public
 */
export const selectNextTask = (
  tasks: readonly LoopTask[],
  onlyTaskId: string | undefined,
): LoopTask | undefined => {
  const scoped = scopeTasks(tasks, onlyTaskId);
  const resumable = lowest(
    scoped.filter((task) => task.status === LOOP_TASK_STATUS.IN_PROGRESS),
  );

  if (resumable !== undefined) {
    return resumable;
  }

  return lowest(
    scoped.filter(
      (task) =>
        task.status === LOOP_TASK_STATUS.PENDING ||
        task.status === LOOP_TASK_STATUS.QUEUED,
    ),
  );
};

const OPEN_STATUSES: ReadonlySet<string> = new Set([
  LOOP_TASK_STATUS.IN_PROGRESS,
  LOOP_TASK_STATUS.PENDING,
  LOOP_TASK_STATUS.QUEUED,
]);

/**
 * @description The three-way close. Any open task is an error outcome (it should be impossible by
 * now); else any `BLOCKED` task means tasks-blocked; else complete. In task-centric mode only that
 * task is considered.
 * @public
 */
export const closePlan = (
  tasks: readonly LoopTask[],
  onlyTaskId: string | undefined,
  completedTaskIds: readonly string[],
): LoopOutcome => {
  const scoped = scopeTasks(tasks, onlyTaskId);

  if (onlyTaskId !== undefined && scoped.length === 0) {
    return { kind: 'failed', reason: `task ${onlyTaskId} not found in plan` };
  }

  const open = scoped.filter((task) => OPEN_STATUSES.has(task.status));

  if (open.length > 0) {
    const ids = open.map((task) => task.id).join(', ');

    return { kind: 'failed', reason: `tasks still open at close: ${ids}` };
  }

  const blocked = scoped.filter(
    (task) => task.status === LOOP_TASK_STATUS.BLOCKED,
  );

  if (blocked.length > 0) {
    return {
      blockedTaskIds: blocked.map((task) => task.id),
      kind: 'tasks_blocked',
    };
  }

  return { completedTaskIds, kind: 'complete' };
};

/**
 * @description A task whose trimmed title + description is shorter than the threshold AND whose
 * requirements are empty cannot be delegated (docs/workflows/ot-loop-job.md § 4).
 * @public
 */
export const isThinTask = (task: LoopTask): boolean => {
  const length = task.title.trim().length + task.description.trim().length;

  return length < THIN_TASK_MIN_CHARS && task.requirements.length === 0;
};
