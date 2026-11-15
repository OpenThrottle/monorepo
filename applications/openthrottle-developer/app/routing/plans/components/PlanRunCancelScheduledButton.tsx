import { AlertDialogTrigger, Button } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PlanRunCancelScheduledDialog } from '~/routing/plans/components/PlanRunCancelScheduledDialog';
import { PLAN_RUN_CANCEL_SCHEDULED_COPY } from '~/routing/plans/data/data.copy';
import { usePlanRunSchedules } from '~/routing/plans/hooks/usePlanRunSchedules';
import { selectScheduleForRun } from '~/routing/plans/utils/plan-run-repeat';

export interface PlanRunCancelScheduledButtonProps {
  readonly planId: string;
  /** The SCHEDULED `plan_runs` row to cancel. Live runs of the plan are left alone. */
  readonly planRunId: string;
}

/**
 * @description The row-level Cancel button for a SCHEDULED run in the run audit table: a trigger
 * over {@link PlanRunCancelScheduledDialog}, which owns the confirm step, submit, toast and
 * revalidation (the same flow the toolbar's caret-menu item opens).
 */
export const PlanRunCancelScheduledButton = (
  props: PlanRunCancelScheduledButtonProps,
): React.ReactElement => {
  const { planId, planRunId } = props;

  // Hooks
  const [open, setOpen] = React.useState(false);
  const { schedules } = usePlanRunSchedules({});

  // Setup
  // An occurrence of a repeating plan is skipped, not cancelled: the chain continues.
  const isOccurrence = selectScheduleForRun(schedules, planRunId) !== undefined;
  const copy = PLAN_RUN_CANCEL_SCHEDULED_COPY;
  const { ariaLabel, triggerLabel, triggerTitle } = isOccurrence
    ? copy.occurrence
    : copy;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <PlanRunCancelScheduledDialog
      onOpenChange={setOpen}
      open={open}
      planId={planId}
      planRunId={planRunId}
    >
      <AlertDialogTrigger asChild={true}>
        <Button
          aria-label={ariaLabel}
          className="text-xs"
          size="xs"
          title={triggerTitle}
          type="button"
          variant="outline"
        >
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
    </PlanRunCancelScheduledDialog>
  );
};
