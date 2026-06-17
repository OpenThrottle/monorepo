import * as React from 'react';
import classnames from 'classnames';
import { isPlanStatusKey } from '~/routing/plans/components/PlanStatusBadge';
import { planStatusValues, type PlanStatusKey } from '~/routing/plans/types';

const STATUS_DOT_COLOR: Record<PlanStatusKey, string> = {
  BACKLOG: 'bg-violet-500',
  BLOCKED: 'bg-red-500',
  CANCELED: 'bg-slate-500',
  COMPLETED: 'bg-lime-500',
  IN_PROGRESS: 'bg-yellow-500',
  PENDING: 'bg-sky-500',
  QUEUED: 'bg-amber-500',
  SKIPPED: 'bg-red-500',
};

export interface PlanStatusChipProps {
  className?: string;
  status: string;
}

/**
 * @description Compact status indicator — a colored dot used inside the tasks
 * table row, where a full {@link PlanStatusBadge} would be redundant with the
 * plan-level badge shown above the table.
 */
export const PlanStatusChip = (
  props: PlanStatusChipProps,
): React.ReactElement => {
  const { className, status } = props;

  // Hooks

  // Setup
  const isKnown = isPlanStatusKey(status);
  const label = isKnown ? planStatusValues[status] : status;
  const color = isKnown ? STATUS_DOT_COLOR[status] : 'bg-muted-foreground/50';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <span
      aria-label={`Status: ${label}`}
      className={classnames(
        'inline-block size-2 shrink-0 rounded-full',
        color,
        className,
      )}
      data-testid="PlanStatusChip"
      role="img"
      title={label}
    />
  );
};
