import * as React from 'react';
import classnames from 'classnames';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  Label,
  Switch,
} from '@openthrottle/react-router-shadcn';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { QueueCardFragment } from '~/__generated__/graphql';
import { QueueStatsChartTooltip } from '~/routing/queues/components/QueueStatsChartTooltip';
import {
  formatQueueStatsChartTick,
  queueStatsChartHeight,
  QUEUE_STATS_CHART_CONFIG,
  queuesToStatsChartData,
  seriesKeysForQueueStatsView,
} from '~/routing/queues/utils/queue-stats-chart';

export interface QueuesStatsProps {
  readonly className?: string;
  readonly queues: QueueCardFragment[];
}

export const QueuesStats = (props: QueuesStatsProps) => {
  const { className, queues } = props;

  const [showCompleted, setShowCompleted] = React.useState(false);

  const chartData = React.useMemo(
    () => queuesToStatsChartData(queues),
    [queues],
  );

  const visibleSeries = React.useMemo(
    () => seriesKeysForQueueStatsView(showCompleted),
    [showCompleted],
  );

  const chartHeight = React.useMemo(
    () => queueStatsChartHeight(chartData.length),
    [chartData.length],
  );

  const isEmpty = chartData.length === 0;

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg tracking-tight" id="queues-stats-heading">
            Job counts by queue
          </h2>
          <p className="text-sm text-muted-foreground">
            {showCompleted
              ? 'All five table fields including completed history. Hover a bar for exact counts.'
              : 'Waiting, delayed, in flight, and failed — backlog and active work. Hover for all five table counts. Toggle to include completed history.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            aria-label="Show completed jobs in chart"
            checked={showCompleted}
            data-testid="queues-stats-show-completed"
            id="queues-stats-show-completed"
            onCheckedChange={setShowCompleted}
          />
          <Label htmlFor="queues-stats-show-completed">Show completed</Label>
        </div>
      </div>

      <div
        className="mt-4 w-full"
        data-testid="queues-stats-chart"
        style={{ minHeight: chartHeight }}
      >
        <ChartContainer
          className="h-full w-full"
          config={QUEUE_STATS_CHART_CONFIG}
        >
          <BarChart
            accessibilityLayer={true}
            data={chartData}
            height={chartHeight}
            layout="vertical"
            margin={{ bottom: 28, left: 4, right: 12, top: 4 }}
            style={{ minHeight: chartHeight }}
          >
            <CartesianGrid
              horizontal={true}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              allowDecimals={false}
              axisLine={false}
              label={{
                offset: 0,
                position: 'insideBottom',
                value: 'Jobs',
              }}
              tickFormatter={formatQueueStatsChartTick}
              tickLine={false}
              type="number"
            />
            <YAxis
              axisLine={false}
              dataKey="name"
              tickLine={false}
              type="category"
              width={128}
            />
            <ChartTooltip content={<QueueStatsChartTooltip />} />
            <ChartLegend content={<ChartLegendContent />} />
            {visibleSeries.map((seriesKey) => (
              <Bar
                dataKey={seriesKey}
                fill={`var(--color-${seriesKey})`}
                key={seriesKey}
                radius={[0, 4, 4, 0]}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </div>
    </section>
  );
};
