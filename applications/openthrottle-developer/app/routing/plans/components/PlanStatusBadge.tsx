import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { getPlanStatusBadgeColor } from '~/routing/plans/utils/utils.plans';
import { planStatusValues, type PlanStatusKey } from '~/routing/plans/types';

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
  const label = planStatusValues[status];

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
        <Link
          title={`View plans filtered by status: ${label}`}
          to={to}
          viewTransition={true}
        >
          {label}
        </Link>
      ) : (
        label
      )}
    </Badge>
  );
};
