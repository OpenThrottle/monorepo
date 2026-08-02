import * as React from 'react';
import {
  Button,
  Card,
  ContributionHeatmap,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { ArrowRightIcon } from 'lucide-react';
import clsx from 'clsx';
import { mapDailyStatsToContributions } from '~/routing/dashboard/utils/contributions-heatmap';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';

export interface DashboardContributionsCardProps {
  className?: string;
  dailyStats: DashboardDailyStatsCardFragment[];
  /** Called with the clicked day's date (YYYY-MM-DD) when a cell is selected. */
  onSelectDate?: (date: string) => void;
}

/**
 * @description Dashboard contributions card: a GitHub-style calendar heatmap of
 * total plan + task activity per day over the loader's dailyStatsRange window.
 * Clicking a day bubbles up via `onSelectDate` to open the daily-stats modal.
 */
export const DashboardContributionsCard = (
  props: DashboardContributionsCardProps,
): React.ReactElement => {
  const { className, dailyStats, onSelectDate } = props;

  // Hooks

  // Setup
  const values = React.useMemo(
    () => mapDailyStatsToContributions(dailyStats),
    [dailyStats],
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={clsx('gap-3 p-4', className)}
      data-testid="DashboardContributionsCard"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Contribution activity</h2>
        <Button asChild={true} size="xs" variant="ghost">
          <Link
            preventScrollReset={true}
            to="/dashboard?modal=daily-stats"
            viewTransition={true}
          >
            Expand chart details <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <ContributionHeatmap
        aria-label="Plan and task activity by day"
        onSelectDate={onSelectDate}
        values={values}
      />
    </Card>
  );
};
