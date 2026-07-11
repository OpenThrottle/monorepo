/**
 * @description Human-readable definitions for OpenThrottle daily aggregated stats (plans/tasks).
 * Mirrors the series shown in the developer dashboard daily stats chart; wording stays conservative because rollups are server-defined.
 */
interface UsageDailyStatsSeries {
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
      'Plans whose immutable completed_at falls on that UTC calendar day. Historical days before completed_at existed are approximate (backfilled from updated_at after migrate-time re-stamps).',
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
      'Tasks whose immutable completed_at falls on that UTC calendar day. Same historical-attribution caveat as plans completed.',
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

/**
 * @description Caveat shown near daily completion charts: pre-completed_at history
 * was backfilled from updated_at after migrate-time mass re-stamps, so day
 * attribution for older completions is approximate.
 */
export const USAGE_COMPLETION_ATTRIBUTION_CAVEAT =
  'Historical completion dates are approximate for rows completed before completed_at existed (backfilled from updated_at after migrate-time re-stamps). New completions use an immutable completed_at stamp.';
