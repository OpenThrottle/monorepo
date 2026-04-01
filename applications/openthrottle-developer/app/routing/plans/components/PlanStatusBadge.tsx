import * as React from 'react';
import classnames from 'classnames';
import { Badge } from '@openthrottle/react-router-shadcn';

export const planStatusValues = {
  BACKLOG: 'Backlog',
  BLOCKED: 'Blocked',
  CANCELED: 'Canceled',
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In Progress',
  PENDING: 'Pending',
  QUEUED: 'Queued',
  SKIPPED: 'Skipped',
} as const;

export type PlanStatusKey = keyof typeof planStatusValues;
export type PlanStatusValue = (typeof planStatusValues)[PlanStatusKey];

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

  const getColor = (status: PlanStatusKey) => {
    let color =
      'border-muted-foreground/50 bg-muted-foreground/20 hover:bg-muted-foreground/50';

    switch (status) {
      case 'BACKLOG':
        color = 'border-slate-400/50 bg-slate-400/20 hover:bg-slate-400/50';
        break;
      case 'BLOCKED':
        color = 'border-amber-500/50 bg-amber-500/20 hover:bg-amber-500/50';
        break;
      case 'CANCELED':
        color = 'border-red-500/50 bg-red-500/20 hover:bg-red-500/50';
        break;
      case 'COMPLETED':
        color = 'border-green-500/50 bg-green-500/20 hover:bg-green-500/50';
        break;
      case 'IN_PROGRESS':
        color = 'border-orange-500/50 bg-orange-500/20 hover:bg-orange-500/50';
        break;
      case 'PENDING':
        color = 'border-blue-500/50 bg-blue-500/20 hover:bg-blue-500/50';
        break;
      case 'QUEUED':
        color = 'border-yellow-500/50 bg-yellow-500/20 hover:bg-yellow-500/50';
        break;
      case 'SKIPPED':
        color =
          'border-muted-foreground/50 bg-muted-foreground/20 hover:bg-muted-foreground/50';
        break;
    }

    return color;
  };

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Badge
      className={classnames(
        'cursor-pointer whitespace-nowrap text-foreground',
        getColor(status),
        className,
      )}
      data-testid="PlanStatusBadge"
      size="xs"
    >
      {planStatusValues[status]}
    </Badge>
  );
};
