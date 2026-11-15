import { Button, Input, toast } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { useFetcher, useRevalidator } from 'react-router';

import type { action as planDetailAction } from '~/routes/plans.$planId._index';
import { PLAN_RUN_REPEAT_COPY } from '~/routing/plans/data/data.copy';
import { usePlanRunSchedules } from '~/routing/plans/hooks/usePlanRunSchedules';
import { selectScheduleForRun } from '~/routing/plans/utils/plan-run-repeat';

export interface PlanRunStopRepeatingButtonProps {
  readonly planId: string;
  /** @description The SCHEDULED run; the button shows only when a schedule's pending occurrence is this run. */
  readonly planRunId: string;
}

/**
 * @description "Stop repeating" for a recurring occurrence: posts `setPlanRunScheduleEnabled`
 * with `enabled=false` to the plan detail route (the server also cancels the pending
 * occurrence), toasts the outcome, then revalidates. Distinct from the row's skip, which keeps
 * the schedule. Renders nothing for a one-off or manual run.
 */
export const PlanRunStopRepeatingButton = (
  props: PlanRunStopRepeatingButtonProps,
): React.ReactElement | null => {
  const { planId, planRunId } = props;

  // Hooks
  const busyRef = React.useRef(false);
  const fetcher = useFetcher<typeof planDetailAction>();
  const revalidator = useRevalidator();
  const { schedules } = usePlanRunSchedules({});

  // Setup
  const StopForm = fetcher.Form;
  const copy = PLAN_RUN_REPEAT_COPY;
  const schedule = selectScheduleForRun(schedules, planRunId);
  const isSubmitting = fetcher.state !== 'idle';
  const label = isSubmitting ? copy.stopPendingLabel : copy.stopLabel;

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const busy = fetcher.state !== 'idle';
    const data = fetcher.data;

    if (busyRef.current && !busy && data != null) {
      if ('setPlanRunScheduleEnabled' in data) {
        toast.success(copy.stoppedToast);
        revalidator.revalidate();
      } else if ('setPlanRunScheduleEnabledError' in data) {
        toast.error(data.setPlanRunScheduleEnabledError);
      }
    }
    busyRef.current = busy;
  }, [fetcher.state, fetcher.data]);

  // 🔌 Short Circuit
  if (schedule === undefined) {
    return null;
  }

  return (
    <StopForm action={`/plans/${planId}`} method="post">
      <Input name="intent" type="hidden" value="setPlanRunScheduleEnabled" />
      <Input name="scheduleId" type="hidden" value={schedule.id} />
      <Input name="enabled" type="hidden" value="false" />
      <Button
        aria-label={copy.stopAriaLabel}
        className="text-xs"
        disabled={isSubmitting}
        size="xs"
        title={copy.stopTitle}
        type="submit"
        variant="outline"
      >
        {label}
      </Button>
    </StopForm>
  );
};
