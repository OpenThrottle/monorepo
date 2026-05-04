import * as React from 'react';
import classnames from 'classnames';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import type { GetQueueQuery } from '~/__generated__/graphql';
import { parseQueueJobDataString } from '~/routing/queues/utils/parse-queue-job-data';
import { queueJobDetailPath } from '~/routing/queues/utils/queue-job-detail-path';

const PAYLOAD_PREVIEW_MAX = 200;

const truncatePreview = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max)}…`;

type QueueJob = NonNullable<
  NonNullable<GetQueueQuery['queue']>['jobs']
>['jobs'][number];

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

export interface QueueJobCardProps {
  readonly className?: string;
  readonly job: QueueJob;
  /** When set, links to the queue job detail route for operational introspection. */
  readonly queueName?: string;
}

/**
 * @description Renders a single queue job: state, BullMQ id (correlation), optional plan/task links from payload, payload preview, failure reason, link to full job detail (retry/cancel/payload there).
 */
export const QueueJobCard = (props: QueueJobCardProps) => {
  const { className, job, queueName } = props;

  const parsed = parseQueueJobDataString(job.data);
  const payloadPreview =
    parsed.prettyJson != null
      ? truncatePreview(parsed.prettyJson, PAYLOAD_PREVIEW_MAX)
      : null;

  return (
    <Card className={classnames('p-4', className)} data-testid="QueueJobCard">
      <CardHeader className="space-y-1.5 p-0">
        <div className="flex flex-row flex-wrap items-center gap-2">
          <Badge
            data-testid={`job-state-${job.id}`}
            variant={JOB_STATE_BADGE_VARIANT[job.state] ?? 'default'}
          >
            {job.state}
          </Badge>
          {job.name != null && job.name !== '' && (
            <CardTitle className="text-base font-medium leading-tight">
              {job.name}
            </CardTitle>
          )}
        </div>
        <CardDescription
          className="font-mono text-xs break-all"
          data-testid={`job-id-${job.id}`}
        >
          {job.id}
        </CardDescription>
      </CardHeader>
      <Separator className="my-2" />
      <CardContent className="p-0 space-y-2">
        {parsed.planId != null && parsed.planId !== '' && (
          <p className="text-sm">
            <span className="text-muted-foreground">Plan</span>{' '}
            <Link
              className="font-mono text-xs text-primary underline-offset-4 hover:underline"
              data-testid={`queue-job-card-plan-${job.id}`}
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
            <p className="text-sm">
              <span className="text-muted-foreground">Task</span>{' '}
              <Link
                className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                data-testid={`queue-job-card-task-${job.id}`}
                to={`/plans/${parsed.planId}/tasks/${parsed.taskId}`}
              >
                {parsed.taskId}
              </Link>
            </p>
          )}
        {(parsed.runKind != null && parsed.runKind !== '') ||
        (parsed.mode != null && parsed.mode !== '') ? (
          <p className="text-xs text-muted-foreground">
            {[parsed.runKind, parsed.mode].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        {parsed.parseError != null && (
          <p className="text-xs text-destructive">{parsed.parseError}</p>
        )}
        {parsed.planId == null &&
          payloadPreview != null &&
          payloadPreview !== '' && (
            <pre className="max-h-24 overflow-hidden text-ellipsis whitespace-pre-wrap break-all rounded border bg-muted/30 p-2 font-mono text-[11px] leading-snug text-muted-foreground">
              {payloadPreview}
            </pre>
          )}
        {job.failedReason != null && job.failedReason !== '' && (
          <p
            className="text-sm font-medium text-destructive break-words"
            data-testid={`job-failedReason-${job.id}`}
          >
            {job.failedReason}
          </p>
        )}
        {queueName != null && queueName !== '' && (
          <p className="pt-1">
            <Link
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              data-testid={`job-detail-link-${job.id}`}
              to={queueJobDetailPath(queueName, job.id)}
            >
              View job details
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
};
