import { parseYamlFrontmatter } from './frontmatter/parse-yaml-frontmatter.ts';
import type { RuleFrontmatter } from './schemas/agent-asset-frontmatter.schemas.ts';

export interface ParsedRuleFrontmatter {
  readonly alwaysApply: boolean | undefined;
  readonly description: string | undefined;
  readonly globs: string | undefined;
}

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * @description Parses Cursor rule frontmatter from `.mdc` files.
 * @publicApi
 */
export const parseRuleFrontmatter = (
  fileContent: string,
): ParsedRuleFrontmatter => {
  const { fields } = parseYamlFrontmatter(fileContent);

  return {
    alwaysApply:
      typeof fields.alwaysApply === 'boolean' ? fields.alwaysApply : undefined,
    description: toOptionalString(fields.description),
    globs: toOptionalString(fields.globs),
  };
};

/**
 * @description Returns raw frontmatter fields for Zod validation (ingest/CI).
 * @publicApi
 */
export const parseRuleFrontmatterForValidation = (
  fileContent: string,
): Record<string, unknown> => {
  const { fields } = parseYamlFrontmatter(fileContent);
  const result: Record<string, unknown> = {};

  if (fields.description !== undefined) {
    result.description = fields.description;
  }
  if (fields.globs !== undefined) {
    result.globs = fields.globs;
  }
  if (fields.alwaysApply !== undefined) {
    result.alwaysApply = fields.alwaysApply;
  }

  return result;
};

export type { RuleFrontmatter };
