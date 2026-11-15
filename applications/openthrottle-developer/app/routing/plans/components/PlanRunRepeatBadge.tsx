import { Badge } from '@openthrottle/react-router-shadcn';
import { RepeatIcon } from 'lucide-react';
import * as React from 'react';

import { PLAN_RUN_REPEAT_COPY } from '~/routing/plans/data/data.copy';
import { usePlanRunSchedules } from '~/routing/plans/hooks/usePlanRunSchedules';
import {
  describeRunSchedule,
  selectScheduleForRun,
} from '~/routing/plans/utils/plan-run-repeat';

export interface PlanRunRepeatBadgeProps {
  /** @description The SCHEDULED run; the badge shows only when a schedule's pending occurrence is this run. */
  readonly planRunId: string;
}

/**
 * @description The Upcoming item's repeat badge: the human-readable rule (cronstrue) of the
 * schedule that materialized this occurrence, with its IANA timezone as the tooltip. Renders
 * nothing for a one-off or manual run.
 */
export const PlanRunRepeatBadge = (
  props: PlanRunRepeatBadgeProps,
): React.ReactElement | null => {
  const { planRunId } = props;

  // Hooks
  const { schedules } = usePlanRunSchedules({});

  // Setup
  const schedule = selectScheduleForRun(schedules, planRunId);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (schedule === undefined) {
    return null;
  }

  const rule = describeRunSchedule(schedule);

  return (
    <Badge
      aria-label={PLAN_RUN_REPEAT_COPY.badgeAriaLabel(rule)}
      data-testid="PlanRunRepeatBadge"
      title={schedule.timezone ?? undefined}
      variant="outline"
    >
      <RepeatIcon aria-hidden={true} />
      {PLAN_RUN_REPEAT_COPY.headerLabel(rule)}
    </Badge>
  );
};
