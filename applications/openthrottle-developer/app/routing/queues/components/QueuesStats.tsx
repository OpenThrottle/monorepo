import * as React from 'react';
import classnames from 'classnames';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@openthrottle/react-router-shadcn';
import {
  Bar,
  BarChart,
  CartesianGrid,
  // LineChart,
  // PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import type { QueueCardFragment } from '~/__generated__/graphql';
import {
  QUEUE_STATS_CHART_CONFIG,
  QUEUE_STATS_CHART_SERIES,
  queuesToStatsChartData,
} from '~/routing/queues/utils/queue-stats-chart';

export interface QueuesStatsProps {
  readonly className?: string;
  readonly queues: QueueCardFragment[];
}

export const QueuesStats = (props: QueuesStatsProps) => {
  const { className, queues } = props;

  // Hooks

  // Setup
  const chartData = React.useMemo(
    () => queuesToStatsChartData(queues),
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
        className={classnames(className)}
        data-testid="QueuesStats"
      >
        <h2 className="text-lg tracking-tight" id="queues-stats-heading">
          Job counts by queue
        </h2>
        <p className="text-sm text-muted-foreground">
          No queues to chart. When workers register Bull queues with the API,
          job counts appear here.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="queues-stats-heading"
      className={classnames(className)}
      data-testid="QueuesStats"
    >
      <h2 className="text-lg tracking-tight" id="queues-stats-heading">
        Job counts by queue
      </h2>
      <p className="text-sm text-muted-foreground">
        Waiting, delayed, in flight, completed, and failed — same fields as the
        table below.
      </p>

      <ChartContainer
        className="mt-4 w-full min-h-[300px]"
        config={QUEUE_STATS_CHART_CONFIG}
      >
        <BarChart
          data={chartData}
          height={300}
          layout="vertical"
          margin={{ bottom: 8, left: 4, right: 12, top: 4 }}
          style={{ minHeight: 300 }}
        >
          <CartesianGrid
            horizontal={true}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis axisLine={false} tickLine={false} type="auto" />
          <YAxis
            axisLine={false}
            dataKey="name"
            tickLine={false}
            type="auto"
            width={120}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {QUEUE_STATS_CHART_SERIES.map((seriesKey) => (
            <Bar
              dataKey={seriesKey}
              fill={`var(--color-${seriesKey})`}
              key={seriesKey}
              radius={[0, 4, 4, 0]}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </section>
  );
};
