import * as React from 'react';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';

export interface DashboardStatsProps {}

export const DashboardStats = (
  _props: DashboardStatsProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="grid gap-4 md:grid-cols-3 md:gap-8 lg:gap-12">
      <OpenThrottleStatCard title="Total plans" value={12} />
      <OpenThrottleStatCard title="Active tasks" value={3} />
      <OpenThrottleStatCard title="Scheduled tasks" value={23} />
    </div>
  );
};
