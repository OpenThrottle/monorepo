import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { HeartHandshakeIcon } from 'lucide-react';
import * as React from 'react';

import type { JobDetailsCardFragment } from '~/__generated__/graphql';
import { buildQueueJobMetricLines } from '~/routing/queues/utils/queue-job-metric-lines';

export interface QueueJobMetricsProps {
  job: JobDetailsCardFragment;
}

export const QueueJobMetrics = (
  props: QueueJobMetricsProps,
): React.ReactElement => {
  const { job } = props;

  // Hooks

  // Setup
  const metricLines = buildQueueJobMetricLines(job.taskRunMetrics);
  const hasMetrics = metricLines.length > 0;

  // Handlers

  // Markup
  const metricsList = (
    <ul className="space-y-1">
      {metricLines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
  const noMetrics = (
    <p className="text-muted-foreground">No metrics recorded.</p>
  );

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
      <div className="text-sm">{hasMetrics ? metricsList : noMetrics}</div>
    </OpenThrottleFieldset>
  );
};
