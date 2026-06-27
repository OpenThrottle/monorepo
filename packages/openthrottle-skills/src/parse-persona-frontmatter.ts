import { parseYamlFrontmatter } from './frontmatter/parse-yaml-frontmatter.ts';
import type { PersonaFrontmatter } from './schemas/agent-asset-frontmatter.schemas.ts';

export interface ParsedPersonaFrontmatter {
  readonly description: string | undefined;
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
 * @description Parses persona frontmatter from `.agents/personas/*.md`.
 * @publicApi
 */
export const parsePersonaFrontmatter = (
  fileContent: string,
): ParsedPersonaFrontmatter => {
  const { fields } = parseYamlFrontmatter(fileContent);

  return {
    description: toOptionalString(fields.description),
    name: toOptionalString(fields.name),
  };
};

/**
 * @description Returns raw frontmatter fields for Zod validation (ingest/CI).
 * @publicApi
 */
export const parsePersonaFrontmatterForValidation = (
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

  return result;
};

export type { PersonaFrontmatter };
