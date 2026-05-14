import * as React from 'react';
import { DashboardDailyStatsCardFragment } from '@openthrottle/openthrottle-developer-codegen';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { DashboardDailyStatsCard } from '~/routing/dashboard/components/DashboardDailyStatsCard';
import { UsageDailyActivityOverview } from '~/routing/usage/components/UsageDailyActivityOverview';

export interface UsageDailyActivityProps {
  readonly className?: string;
  readonly dailyStats: ReadonlyArray<DashboardDailyStatsCardFragment>;
  readonly rangeDays: number;
}

export const UsageDailyActivity = (props: UsageDailyActivityProps) => {
  const { className, dailyStats, rangeDays } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <div className={className} data-testid="UsageDailyActivity">
        <GlobalHeading className="text-xl" title="Daily activity" />
        <DashboardDailyStatsCard className="mt-8" dailyStats={dailyStats} />
      </div>
      <UsageDailyActivityOverview rangeDays={rangeDays} />
    </>
  );
};
