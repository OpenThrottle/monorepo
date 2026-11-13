import { parseYamlFrontmatter } from './frontmatter/parseYamlFrontmatter.ts';
import type { SkillFrontmatter } from './schemas/agent-asset-frontmatter.schemas.ts';

export interface ParsedSkillFrontmatter {
  readonly description: string | undefined;
  readonly disableModelInvocation: boolean | undefined;
  readonly name: string | undefined;
  readonly tags: readonly string[] | undefined;
}

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toOptionalStringArray = (
  value: unknown,
): readonly string[] | undefined => {
  return Array.isArray(value) ? value : undefined;
};

/**
 * @description Parses `name`, `description`, optional `disable-model-invocation`, and optional `tags` from SKILL.md frontmatter. Provenance is NOT frontmatter — it is derived from the ot-skill-sync layout (see `walkAgentAssetFiles.ts` and `parse-skills-lock.ts`).
 * @public
 */
export const parseSkillFrontmatter = (
  fileContent: string,
): ParsedSkillFrontmatter => {
  const { fields } = parseYamlFrontmatter(fileContent);
  const rawFlag = fields['disable-model-invocation'];
  const isBoolean = typeof rawFlag === 'boolean';
  const disableModelInvocation = isBoolean ? rawFlag : undefined;

  return {
    description: toOptionalString(fields.description),
    disableModelInvocation,
    name: toOptionalString(fields.name),
    tags: toOptionalStringArray(fields.tags),
  };
};

/**
 * @description Returns raw frontmatter fields for Zod validation (ingest/CI).
 * @public
 */
export const parseSkillFrontmatterForValidation = (
  fileContent: string,
): Record<string, unknown> => {
  const { fields } = parseYamlFrontmatter(fileContent);
  const result: Record<string, unknown> = {};

  if (fields.name !== undefined) {
    result.name = fields.name;
  }
  if (fields.description !== undefined) {
    result.description = fields.description;
  }
  if (fields['disable-model-invocation'] !== undefined) {
    result['disable-model-invocation'] = fields['disable-model-invocation'];
  }
  if (fields.tags !== undefined) {
    result.tags = fields.tags;
  }

  return result;
};

export type { SkillFrontmatter };
