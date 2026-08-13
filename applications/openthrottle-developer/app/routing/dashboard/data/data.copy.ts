/**
 * @description Single-sourced user-facing copy for the dashboard routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */

/** Copy for the dashboard "Recent chats" card (recent agent conversations). */
export const RECENT_CHATS_CARD_COPY = {
  empty: `No chats yet`,
  newChat: `New chat`,
  title: `Recent chats`,
  untitled: `Untitled chat`,
  viewAll: `View all chats`,
} as const;

/**
 * Curated cross-links surfaced in the Recent chats card footer, selected from
 * WORKSPACE_FULL_JUMP_LINKS by label — no bespoke/duplicated link list.
 */
export const RECENT_CHATS_CARD_DESTINATION_LABELS: readonly string[] = [
  'Plans',
  'Pull requests',
  'Queues',
];

/**
 * Copy for the dashboard GitHub-stats empty state, shown when the server has no
 * `GITHUB_TOKEN` configured. Names the env var and where it lives so the user can
 * act without guessing, instead of staring at zeroed/unauthenticated charts.
 */
export const GITHUB_STATS_TOKEN_EMPTY_STATE_COPY = {
  description: `GitHub stats need a personal access token. Set GITHUB_TOKEN in the server environment (e.g. your .env) and restart the server to see pull-request activity here.`,
  title: `Configure GITHUB_TOKEN`,
} as const;

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
