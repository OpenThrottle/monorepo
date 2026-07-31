import * as React from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Input,
  toast,
} from '@openthrottle/react-router-shadcn';
import { StopCircle } from 'lucide-react';
import { useFetcher, useRevalidator } from 'react-router';
import { action as planDetailAction } from '~/routes/plans.$planId._index';
import {
  cancelPlanRunToastTone,
  describeCancelPlanRunResult,
} from '~/routing/plans/utils/describe-cancel-plan-run-result';

export interface KillPlanRunButtonProps {
  readonly planId: string;
  readonly planTitle: string;
  /** When false, the control is not shown. */
  readonly show: boolean;
  readonly size?: 'xs' | 'sm';
}

/**
 * @description Confirms and submits `cancelPlanRun` for a plan (stops queued Ralph job or signals an active run to stop).
 */
export const KillPlanRunButton = (
  props: KillPlanRunButtonProps,
): React.ReactElement | null => {
  const { planId, planTitle, show, size = 'xs' } = props;

  // Hooks
  const cancelBusyRef = React.useRef(false);
  const fetcher = useFetcher<typeof planDetailAction>();
  const revalidator = useRevalidator();
  const [open, setOpen] = React.useState(false);

  // Setup
  const CancelForm = fetcher.Form;
  const isSubmitting = fetcher.state !== 'idle';
  const triggerTitle = `Cancel the queued worker job or signal an active Ralph run to stop for this plan.`;

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const busy = fetcher.state !== 'idle';

    if (cancelBusyRef.current && !busy) {
      const data = fetcher.data;

      if (data != null && typeof data === 'object') {
        if ('cancelPlanRun' in data && data.cancelPlanRun != null) {
          const message = describeCancelPlanRunResult(data.cancelPlanRun);
          // A no-op cancel (NO_ACTIVE_RUN) is surfaced as info, not a misleading success toast.
          if (cancelPlanRunToastTone(data.cancelPlanRun) === 'success') {
            toast.success(message);
          } else {
            toast.info(message);
          }
          revalidator.revalidate();

          setOpen(false);
        } else if (
          'cancelPlanRunError' in data &&
          typeof data.cancelPlanRunError === 'string'
        ) {
          toast.error(data.cancelPlanRunError);
        }
      }
    }
    cancelBusyRef.current = busy;
  }, [fetcher.state, fetcher.data, revalidator]);

  // 🔌 Short Circuit
  if (!show) {
    return null;
  }

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger asChild={true}>
        <Button
          aria-label={`Kill plan run for ${planTitle}`}
          className="text-xs"
          disabled={isSubmitting}
          size={size}
          title={triggerTitle}
          type="button"
          variant="destructive"
        >
          <StopCircle aria-hidden={true} className="size-3.5 shrink-0" />
          {isSubmitting ? 'Stopping…' : 'Kill run'}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kill plan run?</AlertDialogTitle>
          <AlertDialogDescription>
            This stops the queued worker job for &quot;{planTitle}&quot; or
            signals an active run to terminate. Task or plan edits are not
            deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <CancelForm action={`/plans/${planId}`} method="post">
          <Input name="intent" type="hidden" value="cancelPlanRun" />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting} type="button">
              Cancel
            </AlertDialogCancel>
            <Button disabled={isSubmitting} type="submit" variant="destructive">
              {isSubmitting ? 'Stopping…' : 'Kill run'}
            </Button>
          </AlertDialogFooter>
        </CancelForm>
      </AlertDialogContent>
    </AlertDialog>
  );
};
