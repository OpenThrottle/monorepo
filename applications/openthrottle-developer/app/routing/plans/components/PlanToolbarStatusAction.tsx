import {
  Button,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { CheckCircle } from 'lucide-react';
import * as React from 'react';
import type { useFetcher } from 'react-router';

import type { action } from '~/routes/plans.$planId._index';
import { PlanScheduleConfirmDialog } from '~/routing/plans/components/PlanScheduleConfirmDialog';
import { PLAN_SCHEDULE_CONFIRM_COPY } from '~/routing/plans/data/data.copy';
import { formatPlanScheduledFor } from '~/routing/plans/utils/format-plan-scheduled-for';
import { getPlanMarkCompleteTooltip } from '~/routing/plans/utils/plan-mark-complete-tooltip';

export interface PlanToolbarStatusActionProps {
  readonly fetcherSetPlanStatus: ReturnType<typeof useFetcher<typeof action>>;
  readonly isCompleted: boolean;
  readonly isRunning: boolean;
  readonly planId: string;
  /** @description A SCHEDULED plan asks "This will unschedule the run at <time>" before the status changes. */
  readonly planStatus: string | undefined;
  /** @description The scheduled run's fire time, named in that confirm. */
  readonly scheduledRunAt: Date | string | null | undefined;
}

/**
 * @description The {@link PlanToolbar} Mark Complete control: submits the
 * route's `setPlanStatus` intent via the toolbar's fetcher, gated on completed
 * / running. On a SCHEDULED plan the click first confirms "This will unschedule the run at
 * <time>"; the server cancels the scheduled run as part of the status change (D7), so "yes" is
 * the same plain submit. The confirm is not behind any feature flag: it lives here, wherever the
 * status control renders. Extracted from the toolbar per component-primitive-shape R6.
 */
export const PlanToolbarStatusAction = (
  props: PlanToolbarStatusActionProps,
): React.ReactElement => {
  const {
    fetcherSetPlanStatus,
    isCompleted,
    isRunning,
    planId,
    planStatus,
    scheduledRunAt,
  } = props;

  // Hooks
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // Setup
  const isSubmitting = fetcherSetPlanStatus.state !== 'idle';
  const submitLabel = isSubmitting ? 'Marking…' : 'Mark Complete';
  const isScheduled = planStatus === 'SCHEDULED';
  const localTime = formatPlanScheduledFor(scheduledRunAt);

  // Handlers
  const onConfirm = (): void => {
    setConfirmOpen(false);
    void fetcherSetPlanStatus.submit(
      { intent: 'setPlanStatus', planId, status: 'COMPLETED' },
      { method: 'post' },
    );
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <Tooltip delayDuration={1_000}>
        <TooltipTrigger asChild={true}>
          <fetcherSetPlanStatus.Form method="post">
            <Input name="intent" type="hidden" value="setPlanStatus" />
            <Input name="planId" type="hidden" value={planId} />
            <Input name="status" type="hidden" value="COMPLETED" />
            <Button
              disabled={isSubmitting || isCompleted || isRunning}
              onClick={isScheduled ? () => setConfirmOpen(true) : undefined}
              size="xs"
              type={isScheduled ? 'button' : 'submit'}
              variant="ghost"
            >
              <CheckCircle />
              {submitLabel}
            </Button>
          </fetcherSetPlanStatus.Form>
        </TooltipTrigger>
        <TooltipContent side="top">
          {getPlanMarkCompleteTooltip({ isCompleted, isRunning })}
        </TooltipContent>
      </Tooltip>
      <PlanScheduleConfirmDialog
        confirmLabel={PLAN_SCHEDULE_CONFIRM_COPY.statusConfirmLabel}
        description={PLAN_SCHEDULE_CONFIRM_COPY.statusUnschedule(localTime)}
        isPending={false}
        onConfirm={onConfirm}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        title={PLAN_SCHEDULE_CONFIRM_COPY.statusTitle}
      />
    </>
  );
};
