import { AlertDialogTrigger, Button } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PlanRunCancelScheduledDialog } from '~/routing/plans/components/PlanRunCancelScheduledDialog';
import { PLAN_RUN_CANCEL_SCHEDULED_COPY } from '~/routing/plans/data/data.copy';

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

  // Setup
  const { ariaLabel, triggerLabel, triggerTitle } =
    PLAN_RUN_CANCEL_SCHEDULED_COPY;

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
