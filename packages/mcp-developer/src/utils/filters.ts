import { type TaskListItem } from '../tools/tasks.js';

export function filterTasksByCategory(
  tasks: readonly TaskListItem[],
  category: string,
  planId?: string,
  status?: string,
  limit?: number,
): TaskListItem[] {
  let out = tasks.filter(
    (t) => (t.category ?? '').toLowerCase() === category.toLowerCase(),
  );

  if (planId != null) {
    out = out.filter((t) => t.planId === planId);
  }

  if (status != null) {
    out = out.filter(
      (t) => (t.status ?? '').toUpperCase() === status.toUpperCase(),
    );
  }

  if (limit != null && limit > 0) {
    out = out.slice(0, limit);
  }

  return out;
}
