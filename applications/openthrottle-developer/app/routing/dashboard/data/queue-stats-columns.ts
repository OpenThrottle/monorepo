import type { DashboardQueueStatsCardFragment } from '~/__generated__/graphql';

export interface QueueStatsColumn {
  key: keyof Pick<
    DashboardQueueStatsCardFragment,
    | 'waitingCount'
    | 'activeCount'
    | 'completedCount'
    | 'failedCount'
    | 'delayedCount'
  >;
  label: string;
}

export const QUEUE_STATS_COLUMNS: QueueStatsColumn[] = [
  { key: 'waitingCount', label: 'Waiting' },
  { key: 'activeCount', label: 'Active' },
  { key: 'completedCount', label: 'Completed' },
  { key: 'failedCount', label: 'Failed' },
  { key: 'delayedCount', label: 'Delayed' },
];
