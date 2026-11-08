/**
 * @description Shared constants for the data-retention sweep — the single
 * scheduled job that bounds growth of OpenThrottle's append-only agent tables.
 *
 * Several tables grow with every agent run and had no delete path at all:
 * plan_output_stream (one chunk per narration call), work_sessions /
 * work_session_subjects / work_artifacts (one set per work session),
 * agent_token_usage (one row per assistant turn), skill_usage_events /
 * skill_usage_outcomes (one row per skill invocation) and code_embeddings (one
 * row per indexed chunk per workspace root). BullMQ's own JSONL run output is
 * already pruned; the database side was not.
 *
 * One queue with a declarative policy list is deliberate: five independent
 * sweepers would mean five crons, five Bull Board entries and five places for a
 * batch-size bug to hide.
 */

/** BullMQ queue display name (Bull Board, GraphQL queueName). */
export const DATA_RETENTION_QUEUE_NAME = 'Data Retention';

/** Stable job name for the processor and repeatable registration. */
export const DATA_RETENTION_JOB_NAME = 'data-retention-sweep';

/**
 * Stable BullMQ jobId for the repeatable scheduler so redeploys upsert one
 * schedule instead of accumulating duplicates.
 */
export const DATA_RETENTION_REPEATABLE_JOB_ID = `openthrottle-data-retention-repeatable`;

/**
 * Rows deleted per statement. Retention deletes are bulk operations against
 * tables the app is concurrently writing, so they are chunked: each batch is a
 * short transaction that takes and releases its row locks quickly rather than
 * one long DELETE holding locks over the whole backlog.
 */
export const DATA_RETENTION_BATCH_SIZE = 1_000;

/**
 * Safety stop on batches per policy per sweep. A first enforced run against a
 * large backlog is bounded rather than deleting millions of rows in one pass;
 * the next scheduled sweep continues where this one stopped.
 */
export const DATA_RETENTION_MAX_BATCHES_PER_POLICY = 50;
/**
 * @description Environment contract for the data-retention sweep.
 *
 * Enforcement is OPT-IN. With `DATA_RETENTION_ENFORCE` unset the sweep runs in
 * dry-run mode: it counts what each policy would remove, logs it, and deletes
 * nothing. Retention deletes are irreversible and the rows in question are real
 * plan history, so the default has to be the safe one — an operator reads a few
 * dry-run reports, agrees with the numbers, and only then turns it on.
 *
 * That also makes this deployable ahead of the decision: the policies and their
 * measured impact land now, the deleting starts when someone says so.
 */

/** BullMQ cron: daily at 03:30:00 (UTC unless DATA_RETENTION_TZ is set). */
export const DATA_RETENTION_DEFAULT_CRON_PATTERN = '0 30 3 * * *';
