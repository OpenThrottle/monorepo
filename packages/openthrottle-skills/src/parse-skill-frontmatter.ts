import { parseYamlFrontmatter } from './frontmatter/parse-yaml-frontmatter.ts';
import type { SkillFrontmatter } from './schemas/agent-asset-frontmatter.schemas.ts';

export interface ParsedSkillFrontmatter {
  readonly description: string | undefined;
  readonly disableModelInvocation: boolean | undefined;
  readonly name: string | undefined;
}

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * @description Parses `name`, `description`, and optional `disable-model-invocation` from SKILL.md frontmatter.
 * @publicApi
 */
export const parseSkillFrontmatter = (
  fileContent: string,
): ParsedSkillFrontmatter => {
  const { fields } = parseYamlFrontmatter(fileContent);

  return {
    description: toOptionalString(fields.description),
    disableModelInvocation:
      typeof fields['disable-model-invocation'] === 'boolean'
        ? fields['disable-model-invocation']
        : undefined,
    name: toOptionalString(fields.name),
  };
};

/**
 * @description Returns raw frontmatter fields for Zod validation (ingest/CI).
 * @publicApi
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

  return result;
};

export type { SkillFrontmatter };
