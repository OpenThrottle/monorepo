import type { ChartConfig } from '@openthrottle/react-router-shadcn';

export const PR_TIME_IN_STATE_CHART_CONFIG: ChartConfig = {
  avgDaysInState: {
    color: 'var(--chart-2)',
    label: 'Avg days in state',
  },
  count: { color: 'var(--chart-1)', label: 'Count' },
};
