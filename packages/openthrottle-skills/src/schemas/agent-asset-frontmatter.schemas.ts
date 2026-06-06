import { z } from 'zod';

/** @publicApi */
export const AGENT_ASSET_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const nonEmptyTrimmedString = z.string().trim().min(1);

/**
 * @description Skills (.agents/skills SKILL.md) — D5 hard-fail in CI and ingest.
 * @publicApi
 */
export const skillFrontmatterSchema = z
  .object({
    description: nonEmptyTrimmedString,
    'disable-model-invocation': z.boolean().optional(),
    name: nonEmptyTrimmedString.regex(
      AGENT_ASSET_SLUG_PATTERN,
      'name must be a kebab-case slug',
    ),
  })
  .strict();

export type SkillFrontmatter = z.infer<typeof skillFrontmatterSchema>;

/**
 * @description Personas (.agents/personas id.md) — D5 hard-fail in CI and ingest.
 * @publicApi
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
 * @publicApi
 */
export const ruleFrontmatterSchema = z
  .object({
    alwaysApply: z.boolean().optional(),
    description: z.string().optional(),
    globs: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .passthrough();

export type RuleFrontmatter = z.infer<typeof ruleFrontmatterSchema>;

/** @publicApi */
export type AgentAssetKind = 'persona' | 'prompt' | 'rule' | 'skill';

/** @publicApi */
export interface AgentAssetValidationIssue {
  readonly field: string;
  readonly message: string;
  readonly path: string;
  readonly severity: 'error' | 'warning';
}
