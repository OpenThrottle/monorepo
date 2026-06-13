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
  QUEUE_STATS_CHART_CONFIG,
  queueStatsChartHeight,
  queuesToStatsChartData,
  seriesKeysForQueueStatsView,
} from '~/routing/queues/utils/queue-stats-chart';

export interface QueuesStatsProps {
  className?: string;
  queues: QueueCardFragment[];
}

export const QueuesStats = (props: QueuesStatsProps): React.ReactElement => {
  const { className, queues } = props;

  // Hooks
  const [showCompleted, setShowCompleted] = React.useState(false);

  // Setup
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
        <h2 className="text-md" id="queues-stats-heading">
          Job counts by queue
        </h2>
        <p className="text-muted-foreground text-sm">
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
        <div className="w-full">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-md" id="queues-stats-heading">
              Job counts by queue
            </h2>

            <div className="flex items-center gap-4">
              <Switch
                aria-label="Show completed jobs in chart"
                checked={showCompleted}
                data-testid="queues-stats-show-completed"
                id="queues-stats-show-completed"
                onCheckedChange={setShowCompleted}
              />
              <Label htmlFor="queues-stats-show-completed">
                Show completed
              </Label>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            {showCompleted
              ? 'All five table fields including completed history. Hover a bar for exact counts.'
              : 'Waiting, delayed, in flight, and failed — backlog and active work. Hover for all five table counts. Toggle to include completed history.'}
          </p>
        </div>
      </div>

      <div
        className="mt-4 w-full"
        data-testid="queues-stats-chart"
        style={{ minHeight: `${chartHeight}px` }}
      >
        <ChartContainer
          className="mt-8 min-h-[340px] w-full"
          config={QUEUE_STATS_CHART_CONFIG}
          style={{ minHeight: `${chartHeight}px` }}
        >
          <BarChart
            accessibilityLayer={true}
            data={chartData}
            height={chartHeight}
            margin={{ bottom: 28, left: 4, right: 12, top: 4 }}
            style={{ minHeight: 240 }}
          >
            <CartesianGrid
              horizontal={true}
              strokeDasharray="3 3"
              vertical={false}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              label={{
                offset: -20,
                position: 'insideBottom',
                value: 'Jobs',
              }}
              tickFormatter={formatQueueStatsChartTick}
              tickLine={false}
              type="number"
            />
            <XAxis
              axisLine={false}
              dataKey="name"
              tickLine={false}
              type="category"
              // width={128}
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
