/**
 * @description In-app path to a plan or a task anchor on the plan detail page.
 */
export function planOrTaskDetailHref(
  planId: string,
  taskId?: string | null,
): string {
  const base = `/plans/${planId}`;
  if (taskId != null && taskId !== '') {
    return `${base}#task-${taskId}`;
  }

  return base;
}
