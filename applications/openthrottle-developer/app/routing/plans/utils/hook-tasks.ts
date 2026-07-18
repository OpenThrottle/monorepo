/**
 * @description Helpers for separating materialized lifecycle-hook tasks from
 * regular tasks. Hook tasks are real task rows (they come back from
 * tasksByPlanId) marked with a non-null `hookRole`; the design requires
 * consumers to identify and visually separate them, so the plan board/list
 * filter them out and render them via the nested beforeHooks/afterHooks instead.
 */

interface HookRoleBearing {
  hookRole?: string | null;
}

/** @description True when a task row is a materialized lifecycle hook (has a hookRole). */
export const isHookTask = (task: HookRoleBearing): boolean =>
  task.hookRole != null;

/** @description Drops materialized hook tasks, keeping only regular tasks. */
export const filterOutHookTasks = <T extends HookRoleBearing>(
  tasks: readonly T[],
): T[] => tasks.filter((task) => !isHookTask(task));
