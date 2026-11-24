/**
 * @description Static option lists for the rules form selects. Hoisted out of
 * RuleForm per component-primitive-shape R4 (hardcoded data → `data/`).
 */

import { RULES_COPY } from '~/routing/rules/data/data.copy';

/** Sentinel select value meaning "match any" (serialized as '' on submit). */
export const ANY = 'any';

export const ENVIRONMENTS = ['ci', 'headless', 'interactive'];

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

/** Action-type select labels, so the trigger can render its label during SSR. */
export const ACTION_TYPE_LABELS: Readonly<Record<string, string>> = {
  'attach-prompt': RULES_COPY.attachPromptOption,
  'availability-exception': RULES_COPY.availabilityExceptionOption,
  'inject-task': RULES_COPY.injectTaskOption,
};

export const ATTACH_PROMPT_TYPES = ['personas', 'prompts'] as const;

export const DEFAULT_ATTACH_PROMPT_PLACEMENT = 'end';

export const DEFAULT_ATTACH_PROMPT_TYPE = 'prompts';
