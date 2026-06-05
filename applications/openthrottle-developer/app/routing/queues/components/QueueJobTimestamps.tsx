import * as React from 'react';
import { ClockIcon } from 'lucide-react';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { QueueJobDetailJob } from '~/routing/queues/components/QueueJobDetail';

export interface QueueJobTimestampsProps {
  job: QueueJobDetailJob;
}

export const QueueJobTimestamps = (
  props: QueueJobTimestampsProps,
): React.ReactElement => {
  const { job } = props;

  // Hooks
  const [_bool, _setBool] = React.useState(false);

  // Setup
  const formatTs = (unix?: number | null): string | null => {
    if (unix == null) return null;
    return new Date(unix).toISOString();
  };

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      icon={ClockIcon}
      id="job-timestamps"
      legend="Timestamps"
    >
      <div className="space-y-2 text-sm">
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
      </div>
    </OpenThrottleFieldset>
  );
};
