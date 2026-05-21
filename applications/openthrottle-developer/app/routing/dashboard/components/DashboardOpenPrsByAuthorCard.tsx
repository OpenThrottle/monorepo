import * as React from 'react';
import classnames from 'classnames';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@openthrottle/react-router-shadcn';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { GetDashboardGithubStatsQuery } from '~/__generated__/graphql';
import {
  PRS_BY_AUTHOR_CHART_CONFIG,
  PRS_BY_AUTHOR_CHART_SERIES,
  prsByAuthorToChartData,
} from '~/routing/dashboard/utils/prs-by-author-chart';

/** Open and closed PR counts by author from {@link getDashboardGithubStats}. */
type DashboardPrsByAuthorGithubStats = Pick<
  GetDashboardGithubStatsQuery,
  'closedPrCountByAuthor' | 'openPrCountByAuthor'
>;

interface DashboardOpenPrsByAuthorCardProps {
  readonly className?: string;
  readonly githubStats: DashboardPrsByAuthorGithubStats;
}

/**
 * @description Renders PRs by author as a grouped horizontal bar chart (open vs closed).
 */
export const DashboardOpenPrsByAuthorCard = (
  props: DashboardOpenPrsByAuthorCardProps,
) => {
  const { className, githubStats } = props;
  const { closedPrCountByAuthor, openPrCountByAuthor } = githubStats;

  // Hooks

  // Setup
  const chartData = React.useMemo(
    () => prsByAuthorToChartData(openPrCountByAuthor, closedPrCountByAuthor),
    [closedPrCountByAuthor, openPrCountByAuthor],
  );

  const isEmpty = chartData.length === 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (isEmpty) {
    return (
      <div
        className={classnames('text-sm text-muted-foreground', className)}
        data-testid="DashboardOpenPrsByAuthorCard"
      >
        No PRs by author.
      </div>
    );
  }

  return (
    <div
      className={classnames('-ml-1 overflow-auto text-sm', className)}
      data-testid="DashboardOpenPrsByAuthorCard"
    >
      <ChartContainer
        className="min-h-[240px] mt-4 w-full"
        config={PRS_BY_AUTHOR_CHART_CONFIG}
      >
        <BarChart
          data={chartData}
          height={240}
          margin={{ bottom: 0, left: 0, right: 12, top: 4 }}
          style={{ minHeight: 240 }}
        >
          <CartesianGrid
            horizontal={true}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            axisLine={true}
            dataKey="author"
            label={{ children: null, height: 100 }}
            tickLine={false}
            visibility="hidden"
          />
          <YAxis axisLine={false} tickLine={false} type="auto" width={30} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {PRS_BY_AUTHOR_CHART_SERIES.map((seriesKey) => (
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
  );
};
