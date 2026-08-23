/**
 * @description Retention policies for the skill-observability tables,
 * `skill_usage_events` (084, 086) and `skill_usage_outcomes` (085).
 *
 * Both are written by the harness skill hooks — one row per skill invocation —
 * and neither has ever had a delete path. The audited database held 269 events
 * and 225 outcomes from ~3 weeks, so they grow at roughly the rate agents are
 * used, indefinitely.
 *
 * They are pruned as two independent policies rather than one: `skill_usage_outcomes`
 * carries a TEXT `session_id`, not a foreign key to the events table, so there is
 * no parent/child relationship to order the deletes around.
 *
 * 90 days is short because these rows are an observability signal, not a record of
 * anything. They answer "which skills are being used, and do they succeed" — a
 * question about recent behaviour. Nothing references them and nothing is
 * reconstructed from them.
 *
 * PRUNED BY `received_at`, NOT `occurred_at`. Both columns exist, and `occurred_at`
 * is the more natural reading of "90 days of history" — but it comes from the
 * reporting harness's own clock. A client with a badly skewed clock could stamp
 * `occurred_at` years in the past and have its row swept on the very next run,
 * losing data that had just arrived. `received_at` defaults to server-side `now()`
 * on insert, so it is monotonic and cannot be influenced by a reporter. For these
 * tables the two are within seconds of each other anyway — hooks report
 * immediately — so nothing is given up by choosing the safe one.
 */

import { createAgeRetentionPolicy } from './create-age-retention-policy';

const RETENTION_DAYS = 90;

const RATIONALE =
  'an observability signal about recent agent behaviour, not a record anything references';

export const skillUsageEventsPolicy = createAgeRetentionPolicy({
  column: 'received_at',
  days: RETENTION_DAYS,
  name: 'skill-usage-events',
  rationale: RATIONALE,
  table: 'skill_usage_events',
});

export const skillUsageOutcomesPolicy = createAgeRetentionPolicy({
  column: 'received_at',
  days: RETENTION_DAYS,
  name: 'skill-usage-outcomes',
  rationale: RATIONALE,
  table: 'skill_usage_outcomes',
});
