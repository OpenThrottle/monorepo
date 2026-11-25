import type { ChartConfig } from '@openthrottle/react-router-shadcn';

/** One row of chart data: date plus the six series. */
export interface DailyStatsChartDatum {
  date: string;
  plansCompleted: number;
  plansCreated: number;
  plansUpdated: number;
  tasksCompleted: number;
  tasksCreated: number;
  tasksUpdated: number;
}

export const DAILY_STATS_CHART_CONFIG: ChartConfig = {
  plansCompleted: { color: 'var(--chart-2)', label: 'Plans completed' },
  plansCreated: { color: 'var(--chart-1)', label: 'Plans created' },
  plansUpdated: { color: 'var(--chart-3)', label: 'Plans updated' },
  tasksCompleted: { color: 'var(--chart-5)', label: 'Tasks completed' },
  tasksCreated: { color: 'var(--chart-4)', label: 'Tasks created' },
  tasksUpdated: { color: 'var(--chart-5)', label: 'Tasks updated' },
};
