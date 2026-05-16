import * as React from 'react';
import classnames from 'classnames';
import { SimpleBarChart } from '@openthrottle/react-router-shadcn';

/** One row for the chart: author + openCount. */
export interface OpenPrsByAuthorDatum {
  readonly author: string;
  readonly openCount: number;
}

export interface DashboardOpenPrsByAuthorCardProps {
  readonly className?: string;
  readonly openPrCountByAuthor: ReadonlyArray<OpenPrsByAuthorDatum>;
}

/**
 * @description Renders Open PRs by Author as a horizontal bar chart (author on Y).
 */
export const DashboardOpenPrsByAuthorCard = (
  props: DashboardOpenPrsByAuthorCardProps,
) => {
  const { className, openPrCountByAuthor } = props;

  // Hooks

  // Setup
  const chartData = React.useMemo(
    () =>
      [...openPrCountByAuthor].map((node) => ({
        author: node.author,
        openCount: node.openCount,
      })),
    [openPrCountByAuthor],
  );

  const isEmpty = chartData.length === 0;

  console.log('🤖 🤖 🤖 chartData', chartData);

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
        No open PRs by author.
      </div>
    );
  }

  return (
    <div
      className={classnames('-ml-1 text-sm overflow-auto', className)}
      data-testid="DashboardOpenPrsByAuthorCard"
    >
      <SimpleBarChart
        categoryKey="author"
        className="min-h-[240px] mt-4 w-full"
        data={chartData}
        layout="vertical"
        valueKey="openCount"
        valueLabel="Open PRs"
      />
    </div>
  );
};
