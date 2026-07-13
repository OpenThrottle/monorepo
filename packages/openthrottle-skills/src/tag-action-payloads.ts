/**
 * @description Zod schemas for `tag_action_rules.action_payload`, keyed by
 * action type. Validated at rule write time (GraphQL/MCP CRUD) so the
 * evaluate worker and executors can trust stored payloads. Co-located with
 * {@link evaluateTagActionRules} following the resolveSkillAvailability
 * precedent (pure, zero I/O). See docs/monorepo/plan-task-tags-rules-design.md
 * ("Rules engine", "Action types").
 */

import { z } from 'zod';
import { AGENT_ASSET_SLUG_PATTERN } from './schemas/agent-asset-frontmatter.schemas.ts';

/**
 * @description The two v1 rule action types.
 * @public
 */
export const TAG_ACTION_TYPES = {
  AVAILABILITY_EXCEPTION: 'availability-exception',
  INJECT_TASK: 'inject-task',
} as const;

/** @public */
export type TagActionType =
  (typeof TAG_ACTION_TYPES)[keyof typeof TAG_ACTION_TYPES];

const kebabSlug = z
  .string()
  .regex(
    AGENT_ASSET_SLUG_PATTERN,
    'must be a kebab-case slug (lowercase letters, digits, single hyphens)',
  );

/**
 * @description Payload for `inject-task`: which skill the injected task should
 * run, where it lands in the plan, and optional title/description templates
 * (interpolation: {{plan.title}}, {{plan.id}}, {{matchedTags}}).
 * @public
 */
export const injectTaskActionPayloadSchema = z
  .object({
    descriptionTemplate: z.string().min(1).optional(),
    placement: z.enum(['first', 'last']).default('first'),
    skillSlug: kebabSlug,
    titleTemplate: z.string().min(1).optional(),
  })
  .strict();

/** @public */
export type InjectTaskActionPayload = z.infer<
  typeof injectTaskActionPayloadSchema
>;

/**
 * @description Payload for `availability-exception`: ephemeral allow/deny
 * inputs appended to the skill-availability resolver on plan-context reads
 * only (never persisted into skill_availability_rules). Domain dimension only.
 * @public
 */
export const availabilityExceptionActionPayloadSchema = z
  .object({
    slugAllow: z.array(kebabSlug).default([]),
    slugDeny: z.array(kebabSlug).default([]),
    tagAllow: z.array(kebabSlug).default([]),
    tagDeny: z.array(kebabSlug).default([]),
  })
  .strict();

/** @public */
export type AvailabilityExceptionActionPayload = z.infer<
  typeof availabilityExceptionActionPayloadSchema
>;

const PAYLOAD_SCHEMAS = {
  [TAG_ACTION_TYPES.AVAILABILITY_EXCEPTION]:
    availabilityExceptionActionPayloadSchema,
  [TAG_ACTION_TYPES.INJECT_TASK]: injectTaskActionPayloadSchema,
} as const;

/**
 * @description Parses (and defaults) an action payload for the given action
 * type. Throws a ZodError with actionable issues when the payload does not
 * match the action type's schema — rule CRUD maps this to a validation error.
 * @public
 */
export const parseTagActionPayload = (
  actionType: TagActionType,
  payload: unknown,
): InjectTaskActionPayload | AvailabilityExceptionActionPayload =>
  PAYLOAD_SCHEMAS[actionType].parse(payload);

/**
 * @description Type guard for {@link TagActionType}.
 * @public
 */
export const isTagActionType = (value: string): value is TagActionType =>
  value === TAG_ACTION_TYPES.INJECT_TASK ||
  value === TAG_ACTION_TYPES.AVAILABILITY_EXCEPTION;
