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
import type { GetQueueQuery } from '~/__generated__/graphql';

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
}

/**
 * @description Renders a single queue job using Card layout: header (state + name), content (id, data, failedReason).
 */
export const QueueJobCard = (props: QueueJobCardProps) => {
  const { className, job } = props;

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
      </CardContent>
    </Card>
  );
};
