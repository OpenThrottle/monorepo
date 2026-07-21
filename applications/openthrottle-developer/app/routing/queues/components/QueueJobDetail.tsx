import * as React from 'react';
import { Badge, Button, toast } from '@openthrottle/react-router-shadcn';
import {
  cancelPlanRunToastTone,
  describeCancelPlanRunResult,
} from '~/routing/plans/utils/describe-cancel-plan-run-result';
import { parseQueueJobDataString } from '~/routing/queues/utils/parse-queue-job-data';
import { QueueCorrelationAndSupport } from '~/routing/queues/components/QueueCorrelationAndSupport';
import { QueueJobMetrics } from '~/routing/queues/components/QueueJobMetrics';
import { QueueJobPayload } from '~/routing/queues/components/QueueJobPayload';
import { QueueJobResults } from '~/routing/queues/components/QueueJobResults';
import { QueueJobTimestamps } from '~/routing/queues/components/QueueJobTimestamps';
import { useFetcher, useRevalidator } from 'react-router';
import type {
  GetQueueJobDetailsQuery,
  QueueJobDetailCancelPlanRunMutation,
  QueueJobDetailRetryMutation,
} from '~/__generated__/graphql';

const JOB_STATE_BADGE_VARIANT: Record<string, 'green' | 'red' | 'yellow'> = {
  active: 'yellow',
  completed: 'green',
  delayed: 'yellow',
  failed: 'red',
  waiting: 'yellow',
};

const CANCELLABLE_STATES = new Set(['active', 'delayed', 'waiting']);

export type QueueJobDetailJob = NonNullable<GetQueueJobDetailsQuery['job']>;

/** Action payload from `queues.$queueId.$jobId` route for mutation feedback. */
type QueueJobDetailActionData =
  | { cancelPlanRunError: string }
  | { retryJobError: string }
  | { cancelPlanRun: QueueJobDetailCancelPlanRunMutation['cancelPlanRun'] }
  | { retryJob: QueueJobDetailRetryMutation['retryJob'] };

export interface QueueJobDetailProps {
  job: QueueJobDetailJob;
  queueName: string;
}

/**
 * @description Full job introspection: payload, correlation, plan/task links, retry and cancel.
 */
export const QueueJobDetail = (
  props: QueueJobDetailProps,
): React.ReactElement => {
  const { job, queueName } = props;

  // Hooks
  const fetcher = useFetcher<QueueJobDetailActionData>();
  const revalidator = useRevalidator();
  const handledSubmissionRef = React.useRef(false);

  // Setup
  const parsed = parseQueueJobDataString(job.data);
  const canRetry = job.state === 'failed';
  const canCancel =
    parsed.planId != null &&
    parsed.planId !== '' &&
    CANCELLABLE_STATES.has(job.state);

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (fetcher.state === 'submitting' || fetcher.state === 'loading') {
      handledSubmissionRef.current = true;
    }

    if (
      fetcher.state !== 'idle' ||
      !handledSubmissionRef.current ||
      fetcher.data == null
    ) {
      return;
    }

    handledSubmissionRef.current = false;

    if (
      'retryJobError' in fetcher.data &&
      typeof fetcher.data.retryJobError === 'string'
    ) {
      toast.error(fetcher.data.retryJobError);
      return;
    }

    if ('retryJob' in fetcher.data && fetcher.data.retryJob != null) {
      const r = fetcher.data.retryJob;
      if (r.success) {
        toast.success(
          r.jobId != null && r.jobId !== ''
            ? `Job re-queued: ${r.jobId}`
            : 'Job re-queued.',
        );
        revalidator.revalidate();
        return;
      }
      toast.error(
        r.error != null && r.error !== '' ? r.error : 'Retry failed.',
      );
      return;
    }

    if (
      'cancelPlanRunError' in fetcher.data &&
      typeof fetcher.data.cancelPlanRunError === 'string'
    ) {
      toast.error(fetcher.data.cancelPlanRunError);
      return;
    }

    if ('cancelPlanRun' in fetcher.data && fetcher.data.cancelPlanRun != null) {
      const message = describeCancelPlanRunResult(fetcher.data.cancelPlanRun);
      // No-op cancel (NO_ACTIVE_RUN) is info, not a misleading success.
      if (cancelPlanRunToastTone(fetcher.data.cancelPlanRun) === 'success') {
        toast.success(message);
      } else {
        toast.info(message);
      }
      revalidator.revalidate();
    }
  }, [fetcher.data, fetcher.state, revalidator]);

  // 🔌 Short Circuit

  return (
    <div className="space-y-6" data-testid="QueueJobDetail">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={JOB_STATE_BADGE_VARIANT[job.state] ?? 'default'}>
            {job.state}
          </Badge>
          {job.name != null && job.name !== '' && (
            <span className="text-lg leading-tight font-medium">
              {job.name}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canRetry && (
            <fetcher.Form method="post">
              <input name="intent" type="hidden" value="retryJob" />
              <Button
                disabled={fetcher.state !== 'idle'}
                size="sm"
                type="submit"
                variant="secondary"
              >
                Retry (failed)
              </Button>
            </fetcher.Form>
          )}
          {canCancel && (
            <fetcher.Form method="post">
              <input name="intent" type="hidden" value="cancelPlanRun" />
              <input name="planId" type="hidden" value={parsed.planId} />
              <Button
                disabled={fetcher.state !== 'idle'}
                size="sm"
                type="submit"
                variant="destructive"
              >
                Cancel plan run
              </Button>
            </fetcher.Form>
          )}
        </div>
      </div>

      {parsed.parseError != null && (
        <div className="border-destructive/50 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm">
          Payload: {parsed.parseError}
        </div>
      )}

      <QueueCorrelationAndSupport job={job} queueName={queueName} />
      <QueueJobPayload job={job} />
      <div className="grid gap-4 md:grid-cols-2">
        <QueueJobTimestamps job={job} />
        <QueueJobMetrics job={job} />
      </div>
      <QueueJobResults job={job} />

      <p className="text-muted-foreground text-xs">
        Retry calls GraphQL{' '}
        <code className="bg-muted rounded px-1">retryJob</code> (failed jobs
        only). Cancel calls{' '}
        <code className="bg-muted rounded px-1">cancelPlanRun</code> for the
        plan id in the payload — same behavior as the plan toolbar stop control.
      </p>
    </div>
  );
};
