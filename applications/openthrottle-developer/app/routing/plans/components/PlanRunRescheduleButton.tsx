import { Button } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PlanRunRescheduleDialog } from '~/routing/plans/components/PlanRunRescheduleDialog';
import { PLAN_RUN_RESCHEDULE_COPY } from '~/routing/plans/data/data.copy';

export interface PlanRunRescheduleButtonProps {
  readonly planId: string;
  /** The SCHEDULED `plan_runs` row to move. */
  readonly planRunId: string;
  /** The run's current fire time (ISO), or `null` when unknown. */
  readonly scheduledFor: string | null;
}

/**
 * @description The row-level Reschedule button for a SCHEDULED run: opens
 * {@link PlanRunRescheduleDialog}, which owns the picker, submit, toast and revalidation.
 */
export const PlanRunRescheduleButton = (
  props: PlanRunRescheduleButtonProps,
): React.ReactElement => {
  const { planId, planRunId, scheduledFor } = props;

  // Hooks
  const [open, setOpen] = React.useState(false);

  // Setup
  const { ariaLabel, triggerLabel, triggerTitle } = PLAN_RUN_RESCHEDULE_COPY;

  // Handlers
  const handleOpen = (): void => {
    setOpen(true);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <Button
        aria-label={ariaLabel}
        className="text-xs"
        onClick={handleOpen}
        size="xs"
        title={triggerTitle}
        type="button"
        variant="outline"
      >
        {triggerLabel}
      </Button>
      {/* Mounted only while open, so every opening seeds its pickers from the
          run's current fire time rather than the one it had at first render. */}
      {open && (
        <PlanRunRescheduleDialog
          onOpenChange={setOpen}
          open={open}
          planId={planId}
          planRunId={planRunId}
          scheduledFor={scheduledFor}
        />
      )}
    </>
  );
};
