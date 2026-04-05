import * as React from 'react';
import classnames from 'classnames';
import { Badge } from '@openthrottle/react-router-shadcn';
import { getPlanStatusBadgeColor } from '~/routing/plans/utils/utils.plans';
import { planStatusValues, type PlanStatusKey } from '~/routing/plans/types';

/**
 * @description True when a task/plan status string is a known {@link planStatusValues} key (safe before passing to {@link PlanStatusBadge}).
 */
export const isPlanStatusKey = (value: string): value is PlanStatusKey =>
  Object.prototype.hasOwnProperty.call(planStatusValues, value);

export interface PlanStatusBadgeProps {
  readonly className?: string;
  readonly status: PlanStatusKey;
}

export const PlanStatusBadge = (props: PlanStatusBadgeProps) => {
  const { className, status } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Badge
      className={classnames(
        'cursor-pointer whitespace-nowrap text-foreground',
        getPlanStatusBadgeColor(status),
        className,
      )}
      data-testid="PlanStatusBadge"
      size="xs"
    >
      {planStatusValues[status]}
    </Badge>
  );
};
