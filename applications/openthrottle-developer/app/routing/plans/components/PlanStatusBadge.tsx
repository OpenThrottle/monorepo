import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
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
}

export const PlanStatusBadge = (props: PlanStatusBadgeProps) => {
  const { className, status } = props;

  // Hooks

  // Setup
  const color = getPlanStatusBadgeColor(status);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Badge
      className={className}
      color={color}
      data-testid="PlanStatusBadge"
      size="xs"
    >
      {planStatusValues[status]}
    </Badge>
  );
};
