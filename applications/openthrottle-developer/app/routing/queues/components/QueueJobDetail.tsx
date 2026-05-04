import * as React from 'react';
import { Link, useFetcher, useRevalidator } from 'react-router';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from '@openthrottle/react-router-shadcn';
import { toast } from 'sonner';
import type {
  GetQueueJobDetailsQuery,
  QueueJobDetailCancelPlanRunMutation,
  QueueJobDetailRetryMutation,
} from '~/__generated__/graphql';
import { describeCancelPlanRunResult } from '~/routing/plans/utils/describe-cancel-plan-run-result';
import { parseQueueJobDataString } from '~/routing/queues/utils/parse-queue-job-data';
import { queueJobDetailPath } from '~/routing/queues/utils/queue-job-detail-path';

const JOB_STATE_BADGE_VARIANT: Record<
  string,
  'default' | 'destructive' | 'outline' | 'secondary'
> = {
  active: 'default',
  completed: 'secondary',
  delayed: 'outline',
  failed: 'destructive',
  waiting: 'outline',
};

const CANCELLABLE_STATES = new Set(['active', 'delayed', 'waiting']);

export type QueueJobDetailJob = NonNullable<GetQueueJobDetailsQuery['job']>;

export interface QueueJobDetailProps {
  readonly job: QueueJobDetailJob;
  readonly queueName: string;
}

/** Action payload from `queues.$queueId.$jobId` route for mutation feedback. */
export type QueueJobDetailActionData =
  | { cancelPlanRunError: string }
  | { retryJobError: string }
  | {
      cancelPlanRun: QueueJobDetailCancelPlanRunMutation['cancelPlanRun'];
    }
  | { retryJob: QueueJobDetailRetryMutation['retryJob'] };

/**
 * @description Full job introspection: payload, correlation, plan/task links, retry and cancel.
 */
export const QueueJobDetail = (props: QueueJobDetailProps) => {
  const { job, queueName } = props;
  const fetcher = useFetcher<QueueJobDetailActionData>();
  const revalidator = useRevalidator();
  const handledSubmissionRef = React.useRef(false);

  const parsed = parseQueueJobDataString(job.data);
  const canRetry = job.state === 'failed';
  const canCancel =
    parsed.planId != null &&
    parsed.planId !== '' &&
    CANCELLABLE_STATES.has(job.state);

  const supportBundle = React.useMemo((): string => {
    const lines: string[] = [
      `queueName: ${queueName}`,
      `jobId: ${job.id}`,
      `state: ${job.state}`,
    ];
    if (parsed.planId) lines.push(`planId: ${parsed.planId}`);
    if (parsed.taskId) lines.push(`taskId: ${parsed.taskId}`);
    if (parsed.correlationId) {
      lines.push(`correlationId: ${parsed.correlationId}`);
    }
    if (job.name) lines.push(`name: ${job.name}`);
    lines.push(`urlPath: ${queueJobDetailPath(queueName, job.id)}`);
    return `${lines.join('\n')}\n`;
  }, [
    job.id,
    job.name,
    job.state,
    parsed.correlationId,
    parsed.planId,
    parsed.taskId,
    queueName,
  ]);

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
      toast.success(describeCancelPlanRunResult(fetcher.data.cancelPlanRun));
      revalidator.revalidate();
    }
  }, [fetcher.data, fetcher.state, revalidator]);

  const formatTs = (unix?: number | null): string | null => {
    if (unix == null) return null;
    return new Date(unix).toISOString();
  };

  const returnValuePretty = React.useMemo((): string | null => {
    if (job.returnvalue == null || job.returnvalue === '') return null;
    try {
      const o = JSON.parse(job.returnvalue) as unknown;
      return JSON.stringify(o, null, 2);
    } catch {
      return job.returnvalue;
    }
  }, [job.returnvalue]);

  return (
    <div className="space-y-6" data-testid="QueueJobDetail">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={JOB_STATE_BADGE_VARIANT[job.state] ?? 'default'}>
            {job.state}
          </Badge>
          {job.name != null && job.name !== '' && (
            <span className="text-lg font-medium leading-tight">
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

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Correlation & support</CardTitle>
          <CardDescription>
            Use these values when matching logs, workers, or support tickets.
            Job id is the BullMQ id for this queue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0 text-sm">
          <p>
            <span className="text-muted-foreground">Queue</span>{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {queueName}
            </code>
          </p>
          <p>
            <span className="text-muted-foreground">Job id</span>{' '}
            <code
              className="break-all rounded bg-muted px-1.5 py-0.5 text-xs"
              data-testid="queue-job-correlation-id"
            >
              {job.id}
            </code>
          </p>
          {parsed.correlationId != null && parsed.correlationId !== '' && (
            <p>
              <span className="text-muted-foreground">Payload correlation</span>{' '}
              <code className="break-all rounded bg-muted px-1.5 py-0.5 text-xs">
                {parsed.correlationId}
              </code>
            </p>
          )}
          {parsed.planId != null && parsed.planId !== '' && (
            <p>
              <span className="text-muted-foreground">Plan</span>{' '}
              <Link
                className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                to={`/plans/${parsed.planId}`}
              >
                {parsed.planId}
              </Link>
            </p>
          )}
          {parsed.taskId != null &&
            parsed.taskId !== '' &&
            parsed.planId != null &&
            parsed.planId !== '' && (
              <p>
                <span className="text-muted-foreground">Task</span>{' '}
                <Link
                  className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                  to={`/plans/${parsed.planId}/tasks/${parsed.taskId}`}
                >
                  {parsed.taskId}
                </Link>
              </p>
            )}
          <div className="pt-2">
            <OpenThrottleClipboard
              className="h-8"
              label="Copy support bundle"
              text={supportBundle}
            />
          </div>
        </CardContent>
      </Card>

      {parsed.parseError != null && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Payload: {parsed.parseError}
        </div>
      )}

      <Card>
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">Job payload (data)</CardTitle>
              <CardDescription>
                Raw JSON stored on the job. May include `ralph` tuning; treat as
                sensitive in shared environments.
              </CardDescription>
            </div>
            {parsed.prettyJson != null && (
              <OpenThrottleClipboard
                className="h-8 shrink-0"
                label="Copy JSON"
                text={parsed.prettyJson}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {parsed.prettyJson != null ? (
            <pre className="max-h-80 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
              {parsed.prettyJson}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              No payload on this job.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Timestamps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-4 pt-0 text-sm">
            <p>
              <span className="text-muted-foreground">Created</span>{' '}
              {formatTs(job.timestamp) ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Started</span>{' '}
              {formatTs(job.processedOn) ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Finished</span>{' '}
              {formatTs(job.finishedOn) ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Progress</span>{' '}
              {job.progress != null ? `${job.progress}%` : '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">
              Process RSS (task metrics)
            </CardTitle>
            <CardDescription>
              Present when the worker recorded task-run metrics for this job.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-sm">
            {job.taskRunMetrics != null ? (
              <ul className="space-y-1">
                <li>
                  Start RSS: {job.taskRunMetrics.atStart.rssMb.toFixed(1)} MB /
                  heap {job.taskRunMetrics.atStart.heapUsedMb.toFixed(1)} MB
                </li>
                <li>
                  End RSS: {job.taskRunMetrics.atEnd.rssMb.toFixed(1)} MB / heap{' '}
                  {job.taskRunMetrics.atEnd.heapUsedMb.toFixed(1)} MB
                </li>
              </ul>
            ) : (
              <p className="text-muted-foreground">No metrics recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {(job.failedReason != null && job.failedReason !== '') ||
      returnValuePretty != null ? (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            {job.failedReason != null && job.failedReason !== '' && (
              <div>
                <p className="mb-1 text-sm font-medium text-destructive">
                  Failure reason
                </p>
                <pre className="whitespace-pre-wrap break-words rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  {job.failedReason}
                </pre>
              </div>
            )}
            {returnValuePretty != null && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Return value</p>
                  <OpenThrottleClipboard
                    className="h-8 shrink-0"
                    label="Copy"
                    text={returnValuePretty}
                  />
                </div>
                <pre className="max-h-80 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
                  {returnValuePretty}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Separator />

      <p className="text-xs text-muted-foreground">
        Retry calls GraphQL{' '}
        <code className="rounded bg-muted px-1">retryJob</code> (failed jobs
        only). Cancel calls{' '}
        <code className="rounded bg-muted px-1">cancelPlanRun</code> for the
        plan id in the payload — same behavior as the plan toolbar stop control.
      </p>
    </div>
  );
};
