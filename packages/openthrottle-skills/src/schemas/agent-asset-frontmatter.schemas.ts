import { z } from 'zod';

/** @public */
export const AGENT_ASSET_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * @description Skill provenance values: `openthrottle` marks skills we author and manage; everything else is `external`.
 * @public
 */
export const SKILL_SOURCES = ['external', 'openthrottle'] as const;

/** @public */
export type SkillSource = (typeof SKILL_SOURCES)[number];

const nonEmptyTrimmedString = z.string().trim().min(1);

/**
 * @description Skills (.agents/skills SKILL.md) — D5 hard-fail in CI and ingest.
 * @public
 */
export const skillFrontmatterSchema = z
  .object({
    description: nonEmptyTrimmedString,
    'disable-model-invocation': z.boolean().optional(),
    name: nonEmptyTrimmedString.regex(
      AGENT_ASSET_SLUG_PATTERN,
      'name must be a kebab-case slug',
    ),
    source: z.enum(SKILL_SOURCES).optional(),
    sourceUrl: nonEmptyTrimmedString.optional(),
    // Permissive on purpose: this schema runs at ingest for external workspace
    // repos, which must not hard-fail on a tag outside this monorepo's
    // committed default vocabulary. The committed-vocabulary enum check is a
    // separate, CI-only validation — see DEFAULT_SKILL_TAG_VOCABULARY and
    // docs/monorepo/skill-availability-design.md ("Tags" section).
    tags: z
      .array(
        nonEmptyTrimmedString.regex(
          AGENT_ASSET_SLUG_PATTERN,
          'tags must be kebab-case slugs',
        ),
      )
      .optional(),
  })
  .strict();

export type SkillFrontmatter = z.infer<typeof skillFrontmatterSchema>;

/**
 * @description Personas (.agents/personas id.md) — D5 hard-fail in CI and ingest.
 * @public
 */
export const personaFrontmatterSchema = z
  .object({
    description: nonEmptyTrimmedString,
    name: nonEmptyTrimmedString.regex(
      AGENT_ASSET_SLUG_PATTERN,
      'name must be a kebab-case slug',
    ),
  })
  .strict();

export type PersonaFrontmatter = z.infer<typeof personaFrontmatterSchema>;

/**
 * @description Rules (.agents/rules mdc files) — D5 warn-only in phase 1.
 * @public
 */
export const ruleFrontmatterSchema = z
  .object({
    alwaysApply: z.boolean().optional(),
    description: z.string().optional(),
    globs: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .passthrough();

export type RuleFrontmatter = z.infer<typeof ruleFrontmatterSchema>;

/** @public */
export type AgentAssetKind = 'persona' | 'prompt' | 'rule' | 'skill';

/** @public */
export interface AgentAssetValidationIssue {
  readonly field: string;
  readonly message: string;
  readonly path: string;
  readonly severity: 'error' | 'warning';
}
