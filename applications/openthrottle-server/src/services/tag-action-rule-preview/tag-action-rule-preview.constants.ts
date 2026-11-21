/**
 * @description The most plans one rule preview evaluates (the caller's newest-updated first).
 * Past it the response says so (`truncated`) instead of silently dropping plans.
 */
export const TAG_ACTION_RULE_PREVIEW_PLAN_CAP = 500;

/** How many non-matching plans a preview explains with a per-condition breakdown. */
export const TAG_ACTION_RULE_PREVIEW_NON_MATCH_SAMPLE_SIZE = 25;
