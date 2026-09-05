import * as React from 'react';
import clsx from 'clsx';
import { isPlanStatusKey } from '~/routing/plans/utils/utils.plans';
import { PLAN_STATUS_DOT_COLOR } from '~/routing/plans/data/plan-status-dot-color';
import { planStatusValues } from '~/routing/plans/types';

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
  const color = isKnown
    ? PLAN_STATUS_DOT_COLOR[status]
    : 'bg-muted-foreground/50';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <span
      aria-label={`Status: ${label}`}
      className={clsx(
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
