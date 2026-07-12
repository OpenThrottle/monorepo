/**
 * @description Single-sourced user-facing copy for the dashboard routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */

export const DAILY_STATS_MODAL_COPY = {
  completionAttributionCaveat: `Historical completion dates are approximate for rows completed before completed_at existed (backfilled from updated_at after migrate-time re-stamps). New completions use an immutable completed_at stamp.`,
  emptyDescription: `No daily stats available for the selected range.`,
  mostRecentHint: `Showing the most recent day. Click a bar in the chart to inspect another day.`,
  title: `Daily activity`,
} as const;

/**
 * Metric rows for the single-day detail view, in display order. `key` matches the
 * numeric fields on a daily-stats row and the `var(--color-<key>)` chart variables.
 */
export const DAILY_STATS_METRICS = [
  { key: 'plansCreated', label: `Plans created` },
  { key: 'plansCompleted', label: `Plans completed` },
  { key: 'plansUpdated', label: `Plans updated` },
  { key: 'tasksCreated', label: `Tasks created` },
  { key: 'tasksCompleted', label: `Tasks completed` },
  { key: 'tasksUpdated', label: `Tasks updated` },
] as const;
