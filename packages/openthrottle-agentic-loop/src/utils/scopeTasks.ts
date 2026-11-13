import type { LoopTask } from '../contract/index.ts';

/** @description Task-centric mode narrows the plan's tasks to the one task; otherwise all of them. */
export const scopeTasks = (
  tasks: readonly LoopTask[],
  onlyTaskId: string | undefined,
): readonly LoopTask[] => {
  if (onlyTaskId === undefined) {
    return tasks;
  }

  return tasks.filter((task) => task.id === onlyTaskId);
};
