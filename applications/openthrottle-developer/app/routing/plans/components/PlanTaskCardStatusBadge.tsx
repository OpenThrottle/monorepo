import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PlanStatusBadge } from '~/routing/plans/components/PlanStatusBadge';
import { formatPlanTaskStatus } from '~/routing/plans/utils/format-status';
import { isPlanStatusKey } from '~/routing/plans/utils/utils.plans';

export interface PlanTaskCardStatusBadgeProps {
  status: string;
}

/**
 * @description Status badge for a task card: the shared plan status badge for a
 * known status, an outlined fallback badge for anything else.
 */
export const PlanTaskCardStatusBadge = (
  props: PlanTaskCardStatusBadgeProps,
): React.ReactElement => {
  const { status } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  if (isPlanStatusKey(status)) {
    return <PlanStatusBadge status={status} />;
  }

  return (
    <Badge
      className="text-foreground"
      data-testid="PlanTaskCard-unknown-status"
      size="xs"
      variant="outline"
    >
      {formatPlanTaskStatus(status)}
    </Badge>
  );
};
