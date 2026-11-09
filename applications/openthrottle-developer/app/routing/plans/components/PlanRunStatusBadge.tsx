import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { getPlanRunStatusBadgeVariant } from '~/routing/plans/utils/plan-run-status-badge';

export interface PlanRunStatusBadgeProps {
  /** Raw `plan_runs.status`. A status without a known label shows its raw value in a neutral badge. */
  readonly status: string;
}

/**
 * @description The humanized, colored badge for any plan run status (see
 * {@link getPlanRunStatusBadgeVariant}). The raw status rides along on `data-status` for tests and
 * styling hooks.
 */
export const PlanRunStatusBadge = (
  props: PlanRunStatusBadgeProps,
): React.ReactElement => {
  const { status } = props;

  // Hooks

  // Setup
  const variant = getPlanRunStatusBadgeVariant(status);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Badge
      color={variant.color}
      data-status={status}
      data-testid="PlanRunStatusBadge"
      size="xs"
    >
      {variant.label}
    </Badge>
  );
};
