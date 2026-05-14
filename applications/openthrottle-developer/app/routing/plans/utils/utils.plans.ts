import { PLAN_STATUS_FILTER_OPTIONS } from '~/routing/plans/config/status-options';
import { PlanStatusKey } from '~/routing/plans/types';

/**
 * Whether the UI should offer stopping a Ralph / plan-run job
 * for this plan status (queue or active worker).
 */
export const getPlanIsCancelable = (
  status: string | null | undefined,
): boolean => {
  return status === 'QUEUED' || status === 'IN_PROGRESS';
};

/**
 * Returns a human-readable label for a plan status
 * (e.g. IN_PROGRESS → "In progress"). Falls back to the raw value if unknown.
 */
export function getPlanStatusLabel(status: string | null | undefined): string {
  if (status == null) return 'Unknown';

  const option = PLAN_STATUS_FILTER_OPTIONS.find(
    (option) => option.value === status,
  );

  return option?.label ?? status;
}

/**
 * Returns the color for a plan status badge
 */
export const getPlanStatusBadgeColor = (status: PlanStatusKey): string => {
  let color = `border-muted-foreground/50 bg-muted-foreground/20 hover:bg-muted-foreground/50`;

  switch (status) {
    case 'BACKLOG':
      color = `border-violet-500/50 bg-violet-500/20 hover:bg-violet-500/50`;
      break;
    case 'BLOCKED':
      color = `border-amber-500/50 bg-amber-500/20 hover:bg-amber-500/50`;
      break;
    case 'CANCELED':
      color = `border-slate-500/50 bg-slate-500/20 hover:bg-slate-500/50`;
      break;
    case 'COMPLETED':
      color = `border-lime-500/50 bg-lime-500/20 hover:bg-lime-500/50`;
      break;
    case 'IN_PROGRESS':
      color = `border-yellow-400/50 bg-yellow-400/20 hover:bg-yellow-400/50`;
      break;
    case 'PENDING':
      color = `border-sky-500/50 bg-sky-500/20 hover:bg-sky-500/50`;
      break;
    case 'QUEUED':
      color = `border-orange-500/50 bg-orange-500/20 hover:bg-orange-500/50`;
      break;
    case 'SKIPPED':
      color = `border-red-500/50 bg-red-500/20 hover:bg-red-500/50`;

      break;
  }

  return color;
};
