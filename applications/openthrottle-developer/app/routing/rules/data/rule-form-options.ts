/**
 * @description Static option lists for the rules form selects. Hoisted out of
 * RuleForm per component-primitive-shape R4 (hardcoded data → `data/`).
 */

/** Sentinel select value meaning "match any" (serialized as '' on submit). */
export const ANY = 'any';

export const ENVIRONMENTS = ['ci', 'interactive', 'ralph'];

export const PLAN_STATUSES = [
  'BACKLOG',
  'BLOCKED',
  'CANCELED',
  'COMPLETED',
  'IN_PROGRESS',
  'PENDING',
  'QUEUED',
  'SKIPPED',
];
