import { Button, cn } from '@openthrottle/react-router-shadcn';
import { CalendarXIcon } from 'lucide-react';
import * as React from 'react';
import { useFetcher } from 'react-router';

import type { action } from '~/routes/plans.$planId._index';
import { PlanScheduleConfirmDialog } from '~/routing/plans/components/PlanScheduleConfirmDialog';
import { PLAN_SCHEDULE_CONFIRM_COPY } from '~/routing/plans/data/data.copy';
import { formatPlanScheduledFor } from '~/routing/plans/utils/format-plan-scheduled-for';

export interface PlanUnscheduleActionProps {
  readonly className: string | undefined;
  readonly planId: string;
  /** @description The scheduled run's fire time, named in the confirm. */
  readonly scheduledRunAt: Date | string | null | undefined;
}

/**
 * @description The status control for a SCHEDULED plan when the beta-gated
 * {@link PlanToolbar} is hidden (D10: without beta preview you unschedule by
 * changing the plan's status). Confirms "This will unschedule the run at
 * <time>", then sets the plan back to PENDING through the route's
 * `setPlanStatus` intent; the server cancels the scheduled run as part of that
 * status change (D7). The caller renders it only for SCHEDULED plans.
 */
export const PlanUnscheduleAction = (
  props: PlanUnscheduleActionProps,
): React.ReactElement => {
  const { className, planId, scheduledRunAt } = props;

  // Hooks
  const fetcher = useFetcher<typeof action>();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // Setup
  const isSubmitting = fetcher.state !== 'idle';
  const label = isSubmitting
    ? PLAN_SCHEDULE_CONFIRM_COPY.unschedulePendingLabel
    : PLAN_SCHEDULE_CONFIRM_COPY.unscheduleLabel;
  const localTime = formatPlanScheduledFor(scheduledRunAt);

  // Handlers
  const onConfirm = (): void => {
    setConfirmOpen(false);
    void fetcher.submit(
      { intent: 'setPlanStatus', planId, status: 'PENDING' },
      { method: 'post' },
    );
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('flex items-center', className)}
      data-testid="PlanUnscheduleAction"
    >
      <Button
        disabled={isSubmitting}
        onClick={() => setConfirmOpen(true)}
        size="xs"
        type="button"
        variant="outline"
      >
        <CalendarXIcon />
        {label}
      </Button>
      <PlanScheduleConfirmDialog
        confirmLabel={PLAN_SCHEDULE_CONFIRM_COPY.unscheduleConfirmLabel}
        description={PLAN_SCHEDULE_CONFIRM_COPY.unscheduleBody(localTime)}
        isPending={false}
        onConfirm={onConfirm}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        title={PLAN_SCHEDULE_CONFIRM_COPY.statusTitle}
      />
    </div>
  );
};
