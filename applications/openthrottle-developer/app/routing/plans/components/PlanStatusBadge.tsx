import { Badge } from '@openthrottle/react-router-shadcn';
import { CalendarClock } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import { type PlanStatusKey, planStatusValues } from '~/routing/plans/types';
import { getPlanScheduledForTitle } from '~/routing/plans/utils/plan-scheduled-run-reason';
import { getPlanStatusBadgeColor } from '~/routing/plans/utils/utils.plans';

export interface PlanStatusBadgeProps {
  className?: string;
  /**
   * The plan's soonest scheduled run (`PlanObject.scheduledRunAt`). A
   * SCHEDULED badge names it in a tooltip, in the viewer's local time.
   */
  scheduledRunAt?: Date | string | null;
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
  const { className, scheduledRunAt, status, to } = props;

  // Hooks

  // Setup
  const color = getPlanStatusBadgeColor(status);
  const label = planStatusValues[status];
  const isScheduled = status === 'SCHEDULED';
  const scheduledTitle = isScheduled
    ? getPlanScheduledForTitle(scheduledRunAt)
    : undefined;

  // Handlers

  // Markup
  const icon = isScheduled && <CalendarClock aria-hidden={true} />;
  const linkedLabel = to != null && (
    <Link
      title={scheduledTitle ?? `View plans filtered by status: ${label}`}
      to={to}
      viewTransition={true}
    >
      {icon}
      {label}
    </Link>
  );
  const staticLabel = (
    <>
      {icon}
      {label}
    </>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Badge
      asChild={to != null}
      className={className}
      color={color}
      data-testid="PlanStatusBadge"
      size="xs"
      title={to == null ? scheduledTitle : undefined}
    >
      {linkedLabel || staticLabel}
    </Badge>
  );
};
