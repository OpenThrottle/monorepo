/**
 * @description Human-readable definitions for OpenThrottle daily aggregated stats (plans/tasks).
 * Mirrors the series shown in the developer dashboard daily stats chart; wording stays conservative because rollups are server-defined.
 */
export interface UsageDailyStatsSeries {
  readonly description: string;
  readonly label: string;
  readonly seriesKey:
    | 'plansCompleted'
    | 'plansCreated'
    | 'plansUpdated'
    | 'tasksCompleted'
    | 'tasksCreated'
    | 'tasksUpdated';
}

export const USAGE_DAILY_STATS_SERIES: readonly UsageDailyStatsSeries[] = [
  {
    description:
      'Plans moved to a completed (or equivalent terminal) state on that calendar day, as recorded in the OT rollups.',
    label: 'Plans completed',
    seriesKey: 'plansCompleted',
  },
  {
    description:
      'New plan records created in OpenThrottle for that day (Ralph, portal, or API), per daily aggregation.',
    label: 'Plans created',
    seriesKey: 'plansCreated',
  },
  {
    description:
      'Plan records that received an update (status, fields, or content) on that day, per daily aggregation.',
    label: 'Plans updated',
    seriesKey: 'plansUpdated',
  },
  {
    description:
      'Tasks marked completed (or equivalent) on that day, per daily aggregation.',
    label: 'Tasks completed',
    seriesKey: 'tasksCompleted',
  },
  {
    description:
      'New task rows associated with plans for that day, per daily aggregation.',
    label: 'Tasks created',
    seriesKey: 'tasksCreated',
  },
  {
    description:
      'Tasks updated (pending → in progress, blocked, etc.) on that day, per daily aggregation.',
    label: 'Tasks updated',
    seriesKey: 'tasksUpdated',
  },
];
