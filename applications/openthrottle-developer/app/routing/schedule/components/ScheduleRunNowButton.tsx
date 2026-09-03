import * as React from 'react';
import { useFetcher, useNavigate, useRevalidator } from 'react-router';
import { Button, toast } from '@openthrottle/react-router-shadcn';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import { action as scheduleDetailAction } from '~/routes/schedule.$jobId._index';

export interface ScheduleRunNowButtonProps {
  readonly jobId: string;
}

/**
 * @description Submits the `run-now` intent for a scheduled job. Uses a fetcher rather
 * than a navigation submit so the action response lands in `fetcher.data`, where the
 * enqueued run id is available — the success toast carries a "View run" action that
 * deep-links straight to that run instead of leaving the user to hunt for it.
 */
export const ScheduleRunNowButton = (
  props: ScheduleRunNowButtonProps,
): React.ReactElement => {
  const { jobId } = props;

  // Hooks
  const fetcher = useFetcher<typeof scheduleDetailAction>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  // `fetcher.data` is stable across re-renders, so the effect must remember what it
  // has already announced or a parent re-render would re-toast the same run.
  const toastedRef = React.useRef<string | null>(null);

  // Setup
  const RunNowForm = fetcher.Form;
  const isSubmitting = fetcher.state !== 'idle';

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const data = fetcher.data;

    if (isSubmitting || data == null) {
      return;
    }

    if ('runId' in data && typeof data.runId === 'string') {
      const { runId } = data;

      if (toastedRef.current === runId) {
        return;
      }
      toastedRef.current = runId;

      toast.success(SCHEDULE_COPY.runNowQueued, {
        action: {
          label: SCHEDULE_COPY.runNowViewRun,
          onClick: () => navigate(`/schedule/${jobId}/runs/${runId}`),
        },
      });
      // The runs table only refreshes on revalidation, so pull in the new QUEUED row.
      revalidator.revalidate();

      return;
    }

    if ('error' in data && typeof data.error === 'string') {
      const message = data.error.trim();

      if (toastedRef.current === message) {
        return;
      }
      toastedRef.current = message;

      toast.error(message === '' ? SCHEDULE_COPY.runNowError : message);
    }
  }, [fetcher.data, isSubmitting, jobId, navigate, revalidator]);

  // 🔌 Short Circuit

  return (
    <RunNowForm
      action={`/schedule/${jobId}`}
      data-testid="ScheduleRunNowButton"
      method="post"
    >
      <input name="intent" type="hidden" value="run-now" />
      <Button disabled={isSubmitting} size="xs" type="submit" variant="outline">
        {isSubmitting
          ? SCHEDULE_COPY.runNowSubmitting
          : SCHEDULE_COPY.runNowAction}
      </Button>
    </RunNowForm>
  );
};
