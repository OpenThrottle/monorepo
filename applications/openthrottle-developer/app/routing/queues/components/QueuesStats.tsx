import * as React from 'react';
import classnames from 'classnames';
import { SimpleLineChart } from '@openthrottle/react-router-shadcn';
import type { QueueCardFragment } from '~/__generated__/graphql';
import { queuesToBacklogChartData } from '~/routing/queues/utils/queue-backlog-chart';

export interface QueuesStatsProps {
  readonly className?: string;
  readonly queues: QueueCardFragment[];
}

export const QueuesStats = (props: QueuesStatsProps) => {
  const { className, queues } = props;

  // Hooks

  // Setup
  const chartData = React.useMemo(
    () => queuesToBacklogChartData(queues),
    [queues],
  );

  const isEmpty = chartData.length === 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (isEmpty) {
    return (
      <section
        aria-labelledby="queues-stats-heading"
        className={classnames(
          'flex flex-col gap-4 md:gap-8 lg:gap-12',
          className,
        )}
        data-testid="QueuesStats"
      >
        <h2
          className="text-lg font-semibold tracking-tight"
          id="queues-stats-heading"
        >
          Backlog by queue
        </h2>
        <p className="text-sm text-muted-foreground">
          No queues to chart. When workers register Bull queues with the API,
          backlog appears here.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="queues-stats-heading"
      className={classnames(
        'flex flex-col gap-4 md:gap-8 lg:gap-12',
        className,
      )}
      data-testid="QueuesStats"
    >
      <h2
        className="text-lg font-semibold tracking-tight"
        id="queues-stats-heading"
      >
        Backlog by queue
      </h2>
      <SimpleLineChart
        categoryKey="name"
        className="min-h-[240px] mt-4 w-full"
        data={chartData}
        valueKey="backlog"
        valueLabel="Backlog"
      />
    </section>
  );
};
