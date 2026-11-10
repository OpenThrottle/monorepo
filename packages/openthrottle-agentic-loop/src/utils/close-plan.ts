import type { LoopOutcome, LoopTask } from '../contract/index.ts';
import { LOOP_TASK_STATUS } from '../contract/index.ts';
import { scopeTasks } from './scope-tasks.ts';

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
