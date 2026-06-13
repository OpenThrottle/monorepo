import * as React from 'react';
import {
  OpenThrottleClipboard,
  OpenThrottleFieldset,
} from '@openthrottle/react-router-ui';
import { HeartHandshakeIcon } from 'lucide-react';
import { QueueJobDetailJob } from '~/routing/queues/components/QueueJobDetail';
import { formatWorkflowRalphExecutionBackendLabel } from '~/routing/plans/utils/build-workflow-ralph-argv';
import { parseQueueJobDataString } from '~/routing/queues/utils/parse-queue-job-data';
import { Link } from 'react-router';
import { Badge } from '@openthrottle/react-router-shadcn';
import { queueJobDetailPath } from '~/routing/queues/utils/queue-job-detail-path';
// import classnames from 'classnames';

export interface QueueCorrelationAndSupportProps {
  job: QueueJobDetailJob;
  queueName: string;
}

export const QueueCorrelationAndSupport = (
  props: QueueCorrelationAndSupportProps,
): React.ReactElement => {
  const { job, queueName } = props;

  // Hooks
  const [_bool, _setBool] = React.useState(false);

  // Setup
  const parsed = parseQueueJobDataString(job.data);

  // Handlers
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
    if (job.executionBackend != null && job.executionBackend !== '') {
      lines.push(`executionBackend: ${job.executionBackend}`);
    }

    lines.push(`urlPath: ${queueJobDetailPath(queueName, job.id)}`);

    return `${lines.join('\n')}\n`;
  }, [
    job.executionBackend,
    job.id,
    job.name,
    job.state,
    parsed.correlationId,
    parsed.planId,
    parsed.taskId,
    queueName,
  ]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      icon={HeartHandshakeIcon}
      id="correlation-and-support"
      legend="Correlation & Support"
    >
      <div className="space-y-2 text-sm">
        <p className="text-muted-foreground text-sm">
          Use these values when matching logs, workers, or support tickets. Job
          id is the BullMQ id for this queue.
        </p>
        <p>
          <span className="text-muted-foreground">Queue</span>{' '}
          <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
            {queueName}
          </code>
        </p>
        {job.executionBackend != null && job.executionBackend !== '' && (
          <p>
            <span className="text-muted-foreground">Runner</span>{' '}
            <span className="text-foreground text-xs">
              {formatWorkflowRalphExecutionBackendLabel(job.executionBackend)}{' '}
              <code className="bg-muted rounded px-1 py-0.5 font-mono text-[0.65rem]">
                {job.executionBackend}
              </code>
            </span>
          </p>
        )}
        <p>
          <span className="text-muted-foreground">Job id</span>{' '}
          <code
            className="bg-muted rounded px-1.5 py-0.5 text-xs break-all"
            data-testid="queue-job-correlation-id"
          >
            {job.id}
          </code>
        </p>
        {parsed.correlationId != null && parsed.correlationId !== '' && (
          <p>
            <span className="text-muted-foreground">Payload correlation</span>{' '}
            <code className="bg-muted rounded px-1.5 py-0.5 text-xs break-all">
              {parsed.correlationId}
            </code>
          </p>
        )}
        {parsed.planId != null && parsed.planId !== '' && (
          <p>
            <span className="text-muted-foreground">Plan</span>{' '}
            <Link
              className="text-primary font-mono text-xs underline-offset-4 hover:underline"
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
                className="text-primary font-mono text-xs underline-offset-4 hover:underline"
                to={`/plans/${parsed.planId}/tasks/${parsed.taskId}`}
              >
                {parsed.taskId}
              </Link>
            </p>
          )}
        <div className="flex justify-end">
          <Badge color="red">
            <OpenThrottleClipboard
              label="Copy support bundle"
              text={supportBundle}
            />
          </Badge>
        </div>
      </div>
    </OpenThrottleFieldset>
  );
};
