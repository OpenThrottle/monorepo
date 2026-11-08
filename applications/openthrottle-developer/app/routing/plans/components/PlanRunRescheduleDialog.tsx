import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { useFetcher, useRevalidator } from 'react-router';

import { parseDate } from '~/global/utils/dates';
import type { action as planDetailAction } from '~/routes/plans.$planId._index';
import { PlanRunDialogSchedule } from '~/routing/plans/components/PlanRunDialogSchedule';
import { PLAN_RUN_RESCHEDULE_COPY } from '~/routing/plans/data/data.copy';
import { getPlanRunDialogScheduleFeedback } from '~/routing/plans/utils/plan-run-dialog-schedule-feedback';
import {
  composeScheduleInstant,
  formatScheduledInstant,
  formatScheduleTime,
  getDefaultScheduleInstant,
  getLocalTimeZone,
} from '~/routing/plans/utils/plan-run-schedule';

export interface PlanRunRescheduleDialogProps {
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly planId: string;
  /** The SCHEDULED `plan_runs` row whose start time moves. */
  readonly planRunId: string;
  /** The run's current fire time (ISO); the pickers open on it, or on a default when `null`. */
  readonly scheduledFor: string | null;
}

/**
 * @description Controlled dialog that moves ONE scheduled run's fire time in place: reuses
 * {@link PlanRunDialogSchedule} for the date + time picker (prefilled from the run's current
 * fire time), posts `intent=reschedulePlanRun` with `planRunId` and an ISO `scheduledFor`,
 * toasts the outcome, revalidates and closes on success.
 */
export const PlanRunRescheduleDialog = (
  props: PlanRunRescheduleDialogProps,
): React.ReactElement => {
  const { onOpenChange, open, planId, planRunId, scheduledFor } = props;

  // Hooks
  const busyRef = React.useRef(false);
  const fetcher = useFetcher<typeof planDetailAction>();
  const revalidator = useRevalidator();
  const [initial] = React.useState(() => {
    return parseDate(scheduledFor) ?? getDefaultScheduleInstant(new Date());
  });
  const [date, setDate] = React.useState<Date | undefined>(initial);
  const [time, setTime] = React.useState(() => formatScheduleTime(initial));

  // Setup
  const copy = PLAN_RUN_RESCHEDULE_COPY;
  const RescheduleForm = fetcher.Form;
  const isSubmitting = fetcher.state !== 'idle';
  const timeZone = getLocalTimeZone();
  const instant = composeScheduleInstant(date, time);
  const { scheduleError, scheduleSummary } = getPlanRunDialogScheduleFeedback({
    instant,
    isScheduleMode: true,
    now: new Date(),
  });
  const isSubmitDisabled = scheduleError !== null || isSubmitting;

  // Handlers
  const handleCancel = (): void => {
    onOpenChange(false);
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const busy = fetcher.state !== 'idle';

    if (busyRef.current && !busy) {
      const data = fetcher.data;

      if (data != null && typeof data === 'object') {
        if ('reschedulePlanRun' in data && data.reschedulePlanRun != null) {
          toast.success(
            PLAN_RUN_RESCHEDULE_COPY.successToast(
              formatScheduledInstant(data.reschedulePlanRun.scheduledFor),
            ),
          );
          revalidator.revalidate();
          onOpenChange(false);
        } else if (
          'reschedulePlanRunError' in data &&
          typeof data.reschedulePlanRunError === 'string'
        ) {
          toast.error(data.reschedulePlanRunError);
        }
      }
    }
    busyRef.current = busy;
  }, [fetcher.state, fetcher.data, onOpenChange, revalidator]);

  // 🔌 Short Circuit

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.dialogTitle}</DialogTitle>
          <DialogDescription>{copy.dialogBody}</DialogDescription>
        </DialogHeader>
        <RescheduleForm action={`/plans/${planId}`} method="post">
          <input name="intent" type="hidden" value="reschedulePlanRun" />
          <input name="planRunId" type="hidden" value={planRunId} />
          <input
            name="scheduledFor"
            type="hidden"
            value={instant?.toISOString() ?? ''}
          />
          <PlanRunDialogSchedule
            date={date}
            error={scheduleError}
            onDateChange={setDate}
            onTimeChange={setTime}
            summary={scheduleSummary}
            time={time}
            timeZone={timeZone}
          />
          <DialogFooter className="mt-4">
            <Button
              disabled={isSubmitting}
              onClick={handleCancel}
              type="button"
              variant="outline"
            >
              {copy.cancelLabel}
            </Button>
            <Button disabled={isSubmitDisabled} type="submit">
              {isSubmitting ? copy.pendingLabel : copy.submitLabel}
            </Button>
          </DialogFooter>
        </RescheduleForm>
      </DialogContent>
    </Dialog>
  );
};
