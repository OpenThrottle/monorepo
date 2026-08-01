import type { PlanStatusKey } from '~/routing/plans/types';

/** Tailwind dot color per plan status, for the compact `PlanStatusChip`. */
export const PLAN_STATUS_DOT_COLOR: Record<PlanStatusKey, string> = {
  BACKLOG: 'bg-violet-500',
  BLOCKED: 'bg-red-500',
  CANCELED: 'bg-slate-500',
  COMPLETED: 'bg-lime-500',
  IN_PROGRESS: 'bg-yellow-500',
  PENDING: 'bg-sky-500',
  QUEUED: 'bg-amber-500',
  SKIPPED: 'bg-red-500',
};
