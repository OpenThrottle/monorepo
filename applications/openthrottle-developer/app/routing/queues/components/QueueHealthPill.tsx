import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import { QUEUE_HEALTH_DOT_CLASS } from '~/routing/queues/data/queue-health-display';
import {
  computeQueueHealth,
  type QueueHealthCounts,
} from '~/routing/queues/utils/queue-health';

export interface QueueHealthPillProps extends QueueHealthCounts {
  className?: string;
  'data-testid'?: string;
  showLabel?: boolean;
}

/**
 * @description Green/amber/red health pill rolling a queue's failed + backlog counts into one scannable signal.
 */
export const QueueHealthPill = (
  props: QueueHealthPillProps,
): React.ReactElement => {
  const {
    activeCount,
    className,
    'data-testid': dataTestId = 'QueueHealthPill',
    delayedCount,
    failedCount,
    showLabel = true,
    waitingCount,
  } = props;

  // Hooks

  // Setup
  const health = computeQueueHealth({
    activeCount,
    delayedCount,
    failedCount,
    waitingCount,
  });
  const description = `${health.label}: ${failedCount ?? 0} failed, ${health.backlog} in backlog`;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Badge
      aria-label={description}
      className={clsx('gap-1.5', className)}
      color={health.color}
      data-health-level={health.level}
      data-testid={dataTestId}
      title={description}
    >
      <span
        aria-hidden={true}
        className={clsx(
          'size-2 rounded-full',
          QUEUE_HEALTH_DOT_CLASS[health.level],
        )}
      />
      {showLabel ? health.label : null}
    </Badge>
  );
};
