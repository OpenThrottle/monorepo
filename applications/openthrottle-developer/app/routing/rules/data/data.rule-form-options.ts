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
  'PROMOTED',
  'QUEUED',
  'SCHEDULED',
  'SKIPPED',
];

/** The `attach-prompt` action type. Mirrors the server's tag-action vocabulary; the skills package is server-only, so the client keeps its own copy. */
export const ATTACH_PROMPT_ACTION_TYPE = 'attach-prompt';

export const ATTACH_PROMPT_PLACEMENTS = ['end', 'start'] as const;

export const ATTACH_PROMPT_TYPES = ['personas', 'prompts'] as const;

export const DEFAULT_ATTACH_PROMPT_PLACEMENT = 'end';

export const DEFAULT_ATTACH_PROMPT_TYPE = 'prompts';
