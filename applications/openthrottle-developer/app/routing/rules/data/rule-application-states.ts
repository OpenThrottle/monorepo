/**
 * @description Ledger states in the order the rule detail page lists them:
 * the attention queue (flagged, orphaned) first, then the settled states.
 */
export const RULE_APPLICATION_STATE_ORDER = [
  'flagged',
  'orphaned',
  'applied',
  'pre-satisfied',
] as const;

export type RuleApplicationStateName =
  (typeof RULE_APPLICATION_STATE_ORDER)[number];
