import * as React from 'react';
import { HeartHandshakeIcon } from 'lucide-react';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { QueueJobDetailJob } from '~/routing/queues/components/QueueJobDetail';

export interface QueueJobMetricsProps {
  job: QueueJobDetailJob;
}

export const QueueJobMetrics = (
  props: QueueJobMetricsProps,
): React.ReactElement => {
  const { job } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      icon={HeartHandshakeIcon}
      id="job-metrics"
      legend="Process RSS (task metrics)"
    >
      <p className="text-muted-foreground text-sm">
        Present when the worker recorded task-run metrics for this job.
      </p>
      <div className="text-sm">
        {job.taskRunMetrics != null ? (
          <ul className="space-y-1">
            <li>
              Start RSS: {job.taskRunMetrics.atStart.rssMb.toFixed(1)} MB / heap{' '}
              {job.taskRunMetrics.atStart.heapUsedMb.toFixed(1)} MB
            </li>
            <li>
              End RSS: {job.taskRunMetrics.atEnd.rssMb.toFixed(1)} MB / heap{' '}
              {job.taskRunMetrics.atEnd.heapUsedMb.toFixed(1)} MB
            </li>
          </ul>
        ) : (
          <p className="text-muted-foreground">No metrics recorded.</p>
        )}
      </div>
    </OpenThrottleFieldset>
  );
};
