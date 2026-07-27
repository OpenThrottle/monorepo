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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { ArrowUpCircle } from 'lucide-react';
import { useFetcher, useRevalidator } from 'react-router';
import { action as taskDetailAction } from '~/routes/plans.$planId.tasks.$taskId._index';
import { PLAN_TASK_TOOLBAR_COPY } from '~/routing/plans/data/data.copy';

export interface PromoteTaskButtonProps {
  /** True when the task has already been promoted (SKIPPED + `promoted` tag). */
  readonly isPromoted: boolean;
  /**
   * True when the parent plan run is active (QUEUED / IN_PROGRESS). Promotion is
   * disabled with an explanatory tooltip and cannot open the confirm dialog —
   * closing a task out from under a live worker is unsafe.
   */
  readonly planIsRunning?: boolean;
  readonly size?: 'sm' | 'xs';
}

/**
 * @description Confirms and submits the `promoteTask` intent for the task detail
 * route: enqueues a promotion job that creates a new plan from the task and
 * closes the task out. Disabled with an explanatory tooltip when the task is
 * already promoted. On success, toasts the queued job id (the new plan is
 * created asynchronously and surfaces via the task-status subscription / on the
 * plans list).
 */
export const PromoteTaskButton = (
  props: PromoteTaskButtonProps,
): React.ReactElement => {
  const { isPromoted, planIsRunning = false, size = 'xs' } = props;

  // Hooks
  const busyRef = React.useRef(false);
  const fetcher = useFetcher<typeof taskDetailAction>();
  const revalidator = useRevalidator();
  const [open, setOpen] = React.useState(false);

  // Setup
  const PromoteForm = fetcher.Form;
  const isSubmitting = fetcher.state !== 'idle';

  // Handlers

  // Markup
  const triggerButton = (
    <Button
      aria-label={PLAN_TASK_TOOLBAR_COPY.promoteLabel}
      disabled={isSubmitting || isPromoted || planIsRunning}
      size={size}
      type="button"
      variant="ghost"
    >
      <ArrowUpCircle aria-hidden={true} className="size-3.5 shrink-0" />
      {isSubmitting ? 'Promoting…' : PLAN_TASK_TOOLBAR_COPY.promoteLabel}
    </Button>
  );

  // Life Cycle
  React.useEffect(() => {
    const busy = fetcher.state !== 'idle';

    if (busyRef.current && !busy) {
      const data = fetcher.data;

      if (data != null && typeof data === 'object') {
        if ('promoteTask' in data && data.promoteTask != null) {
          const jobId =
            typeof data.promoteTask === 'object' &&
            'jobId' in data.promoteTask &&
            typeof data.promoteTask.jobId === 'string'
              ? data.promoteTask.jobId
              : null;
          toast.success('Promotion queued', {
            description:
              jobId != null && jobId !== ''
                ? `Job ${jobId}. The new plan appears on the plans list once the job completes.`
                : 'The new plan appears on the plans list once the job completes.',
          });
          revalidator.revalidate();
          setOpen(false);
        } else if (
          'promoteTaskError' in data &&
          typeof data.promoteTaskError === 'string'
        ) {
          toast.error(data.promoteTaskError);
        }
      }
    }
    busyRef.current = busy;
  }, [fetcher.state, fetcher.data, revalidator]);

  // 🔌 Short Circuit
  if (isPromoted) {
    return (
      <Tooltip delayDuration={1_000}>
        <TooltipTrigger asChild={true}>
          {/* Wrapper keeps the tooltip working on the disabled button. */}
          <span className="inline-flex">{triggerButton}</span>
        </TooltipTrigger>
        <TooltipContent side="top">
          {PLAN_TASK_TOOLBAR_COPY.promotedDisabledTooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (planIsRunning) {
    return (
      <Tooltip delayDuration={1_000}>
        <TooltipTrigger asChild={true}>
          {/* Wrapper keeps the tooltip working on the disabled button; the
              disabled trigger also cannot open the confirm dialog. */}
          <span className="inline-flex">{triggerButton}</span>
        </TooltipTrigger>
        <TooltipContent side="top">
          {PLAN_TASK_TOOLBAR_COPY.promoteRunningTooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <Tooltip delayDuration={1_000}>
        <TooltipTrigger asChild={true}>
          <AlertDialogTrigger asChild={true}>
            {triggerButton}
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">
          {PLAN_TASK_TOOLBAR_COPY.promoteTooltip}
        </TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {PLAN_TASK_TOOLBAR_COPY.promoteDialogTitle}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {PLAN_TASK_TOOLBAR_COPY.promoteDialogBody}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <PromoteForm method="post">
          <Input name="intent" type="hidden" value="promoteTask" />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting} type="button">
              Cancel
            </AlertDialogCancel>
            <Button disabled={isSubmitting} type="submit" variant="default">
              {isSubmitting
                ? 'Promoting…'
                : PLAN_TASK_TOOLBAR_COPY.promoteConfirmLabel}
            </Button>
          </AlertDialogFooter>
        </PromoteForm>
      </AlertDialogContent>
    </AlertDialog>
  );
};
