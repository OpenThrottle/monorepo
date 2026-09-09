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
import { Unplug } from 'lucide-react';
import { useFetcher, useRevalidator } from 'react-router';
import type { action as planDetailAction } from '~/routes/plans.$planId._index';
import { PLAN_TOOLBAR_COPY } from '~/routing/plans/data/data.copy';

export interface SettlePlanRunButtonProps {
  readonly planId: string;
  /** The interactive (non-heartbeating) IN_PROGRESS plan_runs row to settle. */
  readonly planRunId: string;
  readonly planTitle: string;
  readonly size?: 'xs' | 'sm';
}

/**
 * @description Confirms and submits `forceSettlePlanRun` for the plan's newest
 * interactive run. This is not a stop — it is the admission that contact with
 * the run was lost: an interactive run has no heartbeat, so nothing can verify
 * it is alive, Kill cannot reach it, and until it is settled its worktree stays
 * held. Settling records the run as STALE and leaves plan/task status alone.
 */
export const SettlePlanRunButton = (
  props: SettlePlanRunButtonProps,
): React.ReactElement => {
  const { planId, planRunId, planTitle, size = 'xs' } = props;

  // Hooks
  const settleBusyRef = React.useRef(false);
  const fetcher = useFetcher<typeof planDetailAction>();
  const revalidator = useRevalidator();
  const [open, setOpen] = React.useState(false);

  // Setup
  const SettleForm = fetcher.Form;
  const isSubmitting = fetcher.state !== 'idle';
  const label = isSubmitting
    ? PLAN_TOOLBAR_COPY.settleRunPendingLabel
    : PLAN_TOOLBAR_COPY.settleRunLabel;

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const busy = fetcher.state !== 'idle';

    if (settleBusyRef.current && !busy) {
      const data = fetcher.data;

      if (data != null && typeof data === 'object') {
        if ('forceSettlePlanRun' in data && data.forceSettlePlanRun != null) {
          toast.success(PLAN_TOOLBAR_COPY.settleRunSuccessToast);
          revalidator.revalidate();

          setOpen(false);
        } else if (
          'forceSettlePlanRunError' in data &&
          typeof data.forceSettlePlanRunError === 'string'
        ) {
          toast.error(data.forceSettlePlanRunError);
        }
      }
    }
    settleBusyRef.current = busy;
  }, [fetcher.state, fetcher.data, revalidator]);

  // 🔌 Short Circuit

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger asChild={true}>
        <Button
          aria-label={PLAN_TOOLBAR_COPY.settleRunAriaLabel(planTitle)}
          className="text-xs"
          disabled={isSubmitting}
          size={size}
          title={PLAN_TOOLBAR_COPY.settleRunTriggerTitle}
          type="button"
          variant="outline"
        >
          <Unplug aria-hidden={true} className="size-3.5 shrink-0" />
          {label}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {PLAN_TOOLBAR_COPY.settleRunDialogTitle}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              {PLAN_TOOLBAR_COPY.settleRunDialogBody(planTitle)}
            </span>
            <span className="block">
              {PLAN_TOOLBAR_COPY.settleRunDialogConsequence}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <SettleForm action={`/plans/${planId}`} method="post">
          <Input name="intent" type="hidden" value="forceSettlePlanRun" />
          <Input name="planRunId" type="hidden" value={planRunId} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting} type="button">
              {PLAN_TOOLBAR_COPY.settleRunCancelLabel}
            </AlertDialogCancel>
            <Button disabled={isSubmitting} type="submit" variant="destructive">
              {isSubmitting
                ? PLAN_TOOLBAR_COPY.settleRunPendingLabel
                : PLAN_TOOLBAR_COPY.settleRunConfirmLabel}
            </Button>
          </AlertDialogFooter>
        </SettleForm>
      </AlertDialogContent>
    </AlertDialog>
  );
};
