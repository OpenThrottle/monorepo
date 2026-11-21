import type { TaskFragment } from '../__generated__/graphql.js';

export function filterTasksByCategory(
  tasks: readonly TaskFragment[],
  category: string,
  planId?: string,
  status?: string,
  limit?: number,
): TaskFragment[] {
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
