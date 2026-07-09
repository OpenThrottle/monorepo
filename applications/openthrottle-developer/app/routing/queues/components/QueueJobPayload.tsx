import {
  OpenThrottleClipboard,
  OpenThrottleFieldset,
} from '@openthrottle/react-router-ui';
import { HeartHandshakeIcon } from 'lucide-react';
import * as React from 'react';
import { QueueJobDetailJob } from '~/routing/queues/components/QueueJobDetail';
import { parseQueueJobDataString } from '~/routing/queues/utils/parse-queue-job-data';
// import clsx from 'clsx';

export interface QueueJobPayloadProps {
  job: QueueJobDetailJob;
}

export const QueueJobPayload = (
  props: QueueJobPayloadProps,
): React.ReactElement => {
  const { job } = props;

  // Hooks
  const [_bool, _setBool] = React.useState(false);

  // Setup
  const parsed = parseQueueJobDataString(job.data);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      icon={HeartHandshakeIcon}
      id="job-payload-data"
      legend="Job payload (data)"
    >
      <p className="text-muted-foreground text-sm">
        Raw JSON stored on the job. May include `ralph` tuning; treat as
        sensitive in shared environments.
      </p>

      <div className="relative">
        {parsed.prettyJson != null ? (
          <>
            <pre className="bg-muted/40 max-h-80 overflow-auto rounded-md border p-3 text-xs">
              {parsed.prettyJson}
            </pre>
            <OpenThrottleClipboard
              className="absolute top-1 right-3 h-8 shrink-0 text-sm"
              label="Copy JSON"
              text={parsed.prettyJson}
            />
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            No payload on this job.
          </p>
        )}
      </div>
    </OpenThrottleFieldset>
  );
};
