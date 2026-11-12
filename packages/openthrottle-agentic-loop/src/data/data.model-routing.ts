/** @description Tier every unmapped, null or blank category falls to; must exist in the policy. */
export const MODEL_ROUTING_DEFAULT_TIER = 'default';

/** @description The most expensive tier; automatic routing can never select it. */
export const MODEL_ROUTING_REVIEW_TIER = 'review';

/** @description Policy file path relative to the monorepo root; the one and only copy of the data. */
export const MODEL_ROUTING_POLICY_RELATIVE_PATH = `skills/ot-loop/references/model-routing.json`;

/** @description Policy `version` this parser understands. */
export const MODEL_ROUTING_POLICY_VERSION = 1;
