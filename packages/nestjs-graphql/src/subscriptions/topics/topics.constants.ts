/**
 * Redis glob pattern matching every {@link planCancelTopic}: `plan:*:cancel`.
 * Plan ids are UUIDs (no colons), so the single `*` never over-matches. Used by
 * the control-plane subscriber's `psubscribe` so a worker need not know which
 * plan ids it owns ahead of time.
 *
 * @public
 */
export const PLAN_CANCEL_TOPIC_PATTERN = 'plan:*:cancel';
