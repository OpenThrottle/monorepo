import * as React from 'react';
import { HeartHandshakeIcon } from 'lucide-react';
import {
  OpenThrottleClipboard,
  OpenThrottleFieldset,
} from '@openthrottle/react-router-ui';
import { QueueJobDetailJob } from '~/routing/queues/components/QueueJobDetail';
// import clsx from 'clsx';

export interface QueueJobResultsProps {
  job: QueueJobDetailJob;
}

export const QueueJobResults = (
  props: QueueJobResultsProps,
): React.ReactElement | null => {
  const { job } = props;

  // Hooks
  const [_bool, _setBool] = React.useState(false);

  // Setup
  const returnValuePretty = React.useMemo((): string | null => {
    if (job.returnvalue == null || job.returnvalue === '') return null;

    try {
      const o: unknown = JSON.parse(job.returnvalue);

      return JSON.stringify(o, null, 2);
    } catch {
      return job.returnvalue;
    }
  }, [job.returnvalue]);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (job.failedReason === null || job.failedReason === '') {
    return null;
  }

  return (
    <OpenThrottleFieldset
      icon={HeartHandshakeIcon}
      id="job-results"
      legend="Results"
    >
      <div className="space-y-4">
        {job.failedReason != null && job.failedReason !== '' && (
          <div>
            <p className="text-destructive mb-1 text-sm font-medium">
              Failure reason
            </p>
            <pre className="border-destructive/40 bg-destructive/5 rounded-md border p-3 text-sm wrap-break-word whitespace-pre-wrap">
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
            <pre className="bg-muted/40 max-h-80 overflow-auto rounded-md border p-3 text-xs">
              {returnValuePretty}
            </pre>
          </div>
        )}
      </div>
    </OpenThrottleFieldset>
  );
};
