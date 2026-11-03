import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { getPlanRunStatusBadgeVariant } from '~/routing/plans/utils/plan-run-status-badge';

export interface PlanRunStatusBadgeProps {
  /** Raw `plan_runs.status`. Only the badged statuses render; any other renders nothing. */
  readonly status: string;
}

/**
 * @description The badge for a plan run status that gets one: USAGE_LIMITED, SCHEDULED, MISSED and
 * SUPERSEDED. Renders nothing for every other status so {@link PlanRunStatusCell} can show it as
 * plain text.
 */
export const PlanRunStatusBadge = (
  props: PlanRunStatusBadgeProps,
): React.ReactElement | null => {
  const { status } = props;

  // Hooks

  // Setup
  const variant = getPlanRunStatusBadgeVariant(status);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (variant === null) {
    return null;
  }

  return (
    <Badge color={variant.color} data-testid="PlanRunStatusBadge" size="xs">
      {variant.label}
    </Badge>
  );
};
