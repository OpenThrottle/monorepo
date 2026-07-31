import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import {
  queueJobStateColor,
  queueJobStateLabel,
} from '~/routing/queues/utils/queue-job-state';

export interface QueueStateBadgeProps {
  className?: string;
  'data-testid'?: string;
  state: string;
}

/**
 * @description Consistent state pill for a BullMQ job; single source of color + label via queue-job-state util.
 */
export const QueueStateBadge = (
  props: QueueStateBadgeProps,
): React.ReactElement => {
  const {
    className,
    'data-testid': dataTestId = 'QueueStateBadge',
    state,
  } = props;

  // Hooks

  // Setup
  const color = queueJobStateColor(state);
  const label = queueJobStateLabel(state);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Badge className={clsx(className)} color={color} data-testid={dataTestId}>
      {label}
    </Badge>
  );
};
