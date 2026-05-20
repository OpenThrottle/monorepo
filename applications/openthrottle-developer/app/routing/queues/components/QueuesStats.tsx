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
  QUEUE_STATS_CHART_CONFIG,
  queuesToStatsChartData,
  seriesKeysForQueueStatsView,
} from '~/routing/queues/utils/queue-stats-chart';

interface QueuesStatsProps {
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
    </section>
  );
};
