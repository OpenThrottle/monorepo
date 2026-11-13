import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
  toast,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { useFetcher, useRevalidator } from 'react-router';

import type { action as planDetailAction } from '~/routes/plans.$planId._index';
import { PLAN_RUN_CANCEL_SCHEDULED_COPY } from '~/routing/plans/data/data.copy';
import {
  cancelPlanRunToastTone,
  describeCancelPlanRunResult,
} from '~/routing/plans/utils/describeCancelPlanRunResult';

export interface PlanRunCancelScheduledDialogProps {
  /** Optional trigger (an `AlertDialogTrigger`); omit it to open the dialog only through `open`. */
  readonly children?: React.ReactNode;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly planId: string;
  /** The SCHEDULED `plan_runs` row to cancel. Live runs of the plan are left alone. */
  readonly planRunId: string;
}

/**
 * @description The controlled confirm-and-submit flow for cancelling ONE scheduled run: posts
 * `intent=cancelPlanRun` with a `planRunId` to the plan detail route, toasts the outcome via
 * `describeCancelPlanRunResult` (NO_ACTIVE_RUN as info, `cancelPlanRunError` as an error), then
 * revalidates so the plan's `scheduledRunAt` / `scheduledRunId` clear and the toolbar Run button
 * re-enables. Mirrors {@link KillPlanRunButton}. Opened by a row's Cancel button
 * ({@link PlanRunCancelScheduledButton}, as `children`) or the toolbar's caret-menu item.
 */
export const PlanRunCancelScheduledDialog = (
  props: PlanRunCancelScheduledDialogProps,
): React.ReactElement => {
  const { children, onOpenChange, open, planId, planRunId } = props;

  // Hooks
  const busyRef = React.useRef(false);
  const fetcher = useFetcher<typeof planDetailAction>();
  const revalidator = useRevalidator();

  // Setup
  const CancelForm = fetcher.Form;
  const isSubmitting = fetcher.state !== 'idle';
  const { confirmLabel, dialogBody, dialogTitle, keepLabel, pendingLabel } =
    PLAN_RUN_CANCEL_SCHEDULED_COPY;

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const busy = fetcher.state !== 'idle';

    if (busyRef.current && !busy) {
      const data = fetcher.data;

      if (data != null && typeof data === 'object') {
        if ('cancelPlanRun' in data && data.cancelPlanRun != null) {
          const message = describeCancelPlanRunResult(data.cancelPlanRun);
          // An already-settled run (NO_ACTIVE_RUN) cancelled nothing: info, not a success toast.
          if (cancelPlanRunToastTone(data.cancelPlanRun) === 'success') {
            toast.success(message);
          } else {
            toast.info(message);
          }
          revalidator.revalidate();

          onOpenChange(false);
        } else if (
          'cancelPlanRunError' in data &&
          typeof data.cancelPlanRunError === 'string'
        ) {
          toast.error(data.cancelPlanRunError);
        }
      }
    }
    busyRef.current = busy;
  }, [fetcher.state, fetcher.data, onOpenChange, revalidator]);

  // 🔌 Short Circuit

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      {children}

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>{dialogBody}</AlertDialogDescription>
        </AlertDialogHeader>
        <CancelForm action={`/plans/${planId}`} method="post">
          <Input name="intent" type="hidden" value="cancelPlanRun" />
          <Input name="planRunId" type="hidden" value={planRunId} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting} type="button">
              {keepLabel}
            </AlertDialogCancel>
            <Button disabled={isSubmitting} type="submit" variant="destructive">
              {isSubmitting ? pendingLabel : confirmLabel}
            </Button>
          </AlertDialogFooter>
        </CancelForm>
      </AlertDialogContent>
    </AlertDialog>
  );
};
