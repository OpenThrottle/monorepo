import type { LoopTask } from '../contract/index.ts';
import { LOOP_TASK_STATUS } from '../contract/index.ts';
import { scopeTasks } from './scopeTasks.ts';

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
