import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { getPlanStatusBadgeColor } from '~/routing/plans/utils/utils.plans';
import { planStatusValues, type PlanStatusKey } from '~/routing/plans/types';

/**
 * @description True when a task/plan status string is a known {@link planStatusValues} key (safe before passing to {@link PlanStatusBadge}).
 */
export const isPlanStatusKey = (value: string): value is PlanStatusKey => {
  return Object.prototype.hasOwnProperty.call(planStatusValues, value);
};

export interface PlanStatusBadgeProps {
  className?: string;
  status: PlanStatusKey;
  /**
   * When provided, the badge renders as a navigable link (e.g. a
   * status-filtered plans list) instead of a static label.
   */
  to?: string;
}

export const PlanStatusBadge = (
  props: PlanStatusBadgeProps,
): React.ReactElement => {
  const { className, status, to } = props;

  // Hooks

  // Setup
  const color = getPlanStatusBadgeColor(status);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Badge
      asChild={to != null}
      className={className}
      color={color}
      data-testid="PlanStatusBadge"
      size="xs"
    >
      {to != null ? (
        <Link to={to} viewTransition={true}>
          {planStatusValues[status]}
        </Link>
      ) : (
        planStatusValues[status]
      )}
    </Badge>
  );
};
