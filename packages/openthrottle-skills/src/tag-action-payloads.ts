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
 * @description The rule action types. `promote-task-to-plan` is a task-scoped
 * automation trigger: a matched rule promotes the plan's tasks carrying the
 * rule's tags into new plans via the same TaskPromotionService the explicit
 * mutation uses.
 * @public
 */
export const TAG_ACTION_TYPES = {
  AVAILABILITY_EXCEPTION: 'availability-exception',
  INJECT_TASK: 'inject-task',
  PROMOTE_TASK_TO_PLAN: 'promote-task-to-plan',
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
 * @description Anchor for `before`/`after` placement: names the target task the
 * injected task lands adjacent to. Resolved (in priority order) by explicit
 * `taskId`, then `skillSlug` reference (`/<slug>` in title/description), then a
 * case-insensitive `titleMatch` substring. Exactly one field should be set.
 * @public
 */
export const injectTaskAnchorSchema = z
  .object({
    skillSlug: kebabSlug.optional(),
    taskId: z.string().uuid().optional(),
    titleMatch: z.string().min(1).optional(),
  })
  .strict()
  .refine(
    (a) =>
      [a.taskId, a.skillSlug, a.titleMatch].filter((v) => v != null).length ===
      1,
    { message: 'anchor must set exactly one of taskId, skillSlug, titleMatch' },
  );

/** @public */
export type InjectTaskAnchor = z.infer<typeof injectTaskAnchorSchema>;

/**
 * @description Payload for `inject-task`: which skill the injected task should
 * run, where it lands in the plan, and optional title/description templates
 * (interpolation: {{plan.title}}, {{plan.id}}, {{matchedTags}}). Placement
 * `first`/`last` land at the plan head/tail; `before`/`after` land adjacent to
 * an `anchor` task (required for those two placements).
 * @public
 */
export const injectTaskActionPayloadSchema = z
  .object({
    anchor: injectTaskAnchorSchema.optional(),
    descriptionTemplate: z.string().min(1).optional(),
    placement: z.enum(['after', 'before', 'first', 'last']).default('first'),
    skillSlug: kebabSlug,
    titleTemplate: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((payload, ctx) => {
    const relative =
      payload.placement === 'before' || payload.placement === 'after';
    if (relative && payload.anchor == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `placement '${payload.placement}' requires an anchor`,
        path: ['anchor'],
      });
    }
    if (!relative && payload.anchor != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `anchor is only valid with placement 'before' or 'after'`,
        path: ['anchor'],
      });
    }
  });

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

/**
 * @description Payload for `promote-task-to-plan`: no configuration in v1. The
 * executor promotes every not-yet-promoted task in the plan that carries one of
 * the rule's matched tags. Kept as a strict empty object so future options
 * (e.g. status filters) can be added without a breaking payload change.
 * @public
 */
export const promoteTaskToPlanActionPayloadSchema = z.object({}).strict();

/** @public */
export type PromoteTaskToPlanActionPayload = z.infer<
  typeof promoteTaskToPlanActionPayloadSchema
>;

const PAYLOAD_SCHEMAS = {
  [TAG_ACTION_TYPES.AVAILABILITY_EXCEPTION]:
    availabilityExceptionActionPayloadSchema,
  [TAG_ACTION_TYPES.INJECT_TASK]: injectTaskActionPayloadSchema,
  [TAG_ACTION_TYPES.PROMOTE_TASK_TO_PLAN]: promoteTaskToPlanActionPayloadSchema,
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
):
  | InjectTaskActionPayload
  | AvailabilityExceptionActionPayload
  | PromoteTaskToPlanActionPayload =>
  PAYLOAD_SCHEMAS[actionType].parse(payload);

/**
 * @description Type guard for {@link TagActionType}.
 * @public
 */
export const isTagActionType = (value: string): value is TagActionType =>
  value === TAG_ACTION_TYPES.INJECT_TASK ||
  value === TAG_ACTION_TYPES.AVAILABILITY_EXCEPTION ||
  value === TAG_ACTION_TYPES.PROMOTE_TASK_TO_PLAN;
