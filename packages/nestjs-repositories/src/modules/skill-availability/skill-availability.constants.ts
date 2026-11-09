/**
 * @description Write-time Zod validation for skill-availability rules. Strict schemas reject
 * malformed config at write time (not at resolve time), with actionable error messages: tags and
 * slugs must be kebab-case, `environment` must be one of SKILL_AVAILABILITY_ENVIRONMENTS (or null),
 * and every allow/deny array defaults to []. Tag references are additionally checked against the
 * caller's vocabulary in the service (see assertKnownTags) — the schema is decoupled from any tag
 * source. See docs/monorepo/skill-availability-design.md ("Rules").
 */

import {
  AGENT_ASSET_SLUG_PATTERN,
  SKILL_AVAILABILITY_ENVIRONMENTS,
} from '@openthrottle/openthrottle-skills';
import { z } from 'zod';

const kebabCaseSlug = z
  .string()
  .trim()
  .min(1)
  .regex(
    AGENT_ASSET_SLUG_PATTERN,
    'must be a kebab-case slug (lowercase letters, digits, single hyphens; e.g. "pr-review")',
  );

/** Posture accepted by upsertRuleSet (matches the resolver's SkillAvailabilityPosture). */
export const skillAvailabilityPostureSchema = z.enum(['allow', 'deny']);

/**
 * Add/update rule input. `.strict()` rejects unknown keys; every allow/deny list defaults to an
 * empty array; `environment` defaults to null (environment-agnostic).
 */
export const skillAvailabilityRuleInputSchema = z
  .object({
    environment: z
      .enum(SKILL_AVAILABILITY_ENVIRONMENTS)
      .nullable()
      .default(null),
    slugAllow: z.array(kebabCaseSlug).default([]),
    slugDeny: z.array(kebabCaseSlug).default([]),
    tagAllow: z.array(kebabCaseSlug).default([]),
    tagDeny: z.array(kebabCaseSlug).default([]),
  })
  .strict();
