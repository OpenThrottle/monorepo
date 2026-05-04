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
import { queueJobDetailPath } from '~/routing/queues/utils/queue-job-detail-path';

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
 * @description Renders a single queue job using Card layout: header (state + name), content (id, data, failedReason).
 */
export const QueueJobCard = (props: QueueJobCardProps) => {
  const { className, job, queueName } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

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
        {job.data != null && job.data !== '' && (
          <p className="text-xs text-muted-foreground break-all">
            data: {job.data}
          </p>
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
