import * as React from 'react';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';
import clsx from 'clsx';
import {
  QUEUE_STAT_ROW_COLUMN_CLASS,
  type QueueStatRowColumns,
} from '~/routing/queues/data/queue-stat-row';

export interface QueueStatRowItem {
  readonly color?: string;
  readonly subValue?: number;
  readonly title: string;
  readonly value: number;
}

export interface QueueStatRowProps {
  className?: string;
  columns?: QueueStatRowColumns;
  stats: readonly QueueStatRowItem[];
}

/**
 * @description Reusable summary stat row over OpenThrottleStatCard so every Queues surface frames counts the same way.
 */
export const QueueStatRow = (props: QueueStatRowProps): React.ReactElement => {
  const { className, columns = 4, stats } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx(
        'grid gap-4 md:gap-8 lg:gap-12',
        QUEUE_STAT_ROW_COLUMN_CLASS[columns],
        className,
      )}
      data-testid="QueueStatRow"
    >
      {stats.map((stat) => (
        <OpenThrottleStatCard
          color={stat.color}
          key={stat.title}
          subValue={stat.subValue}
          title={stat.title}
          value={stat.value}
        />
      ))}
    </div>
  );
};
