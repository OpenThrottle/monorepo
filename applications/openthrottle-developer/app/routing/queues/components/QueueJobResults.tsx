import * as React from 'react';
import { HeartHandshakeIcon } from 'lucide-react';
import {
  OpenThrottleClipboard,
  OpenThrottleFieldset,
} from '@openthrottle/react-router-ui';
import { QueueJobDetailJob } from '~/routing/queues/components/QueueJobDetail';
// import classnames from 'classnames';

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
      const o = JSON.parse(job.returnvalue) as unknown;

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
            <p className="mb-1 text-sm font-medium text-destructive">
              Failure reason
            </p>
            <pre className="whitespace-pre-wrap rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm wrap-break-word">
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
      </div>
    </OpenThrottleFieldset>
  );
};
