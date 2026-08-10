import { parse as parseYamlDocument } from 'yaml';

import { extractFrontmatterBody } from './frontmatter/extract-frontmatter-body.ts';
import { parseYamlFrontmatter } from './frontmatter/parse-yaml-frontmatter.ts';
import type { SkillFrontmatter } from './schemas/agent-asset-frontmatter.schemas.ts';
import { parseSkillArguments } from './skill-arguments.ts';
import type { SkillArgument } from './skill-arguments.ts';

export interface ParsedSkillFrontmatter {
  /**
   * Typed argument declarations from `metadata.openthrottle-arguments`, or
   * `undefined` when the skill declares none (free-text fallback in the UI).
   */
  readonly arguments: readonly SkillArgument[] | undefined;
  readonly description: string | undefined;
  readonly disableModelInvocation: boolean | undefined;
  readonly name: string | undefined;
  readonly tags: readonly string[] | undefined;
}

/**
 * Read the raw frontmatter object (nested maps intact). `parseYamlFrontmatter`
 * flattens frontmatter and collapses nested maps to a placeholder, so the
 * spec's `metadata` map is only reachable by parsing the YAML document directly.
 * Defensive: any malformed frontmatter yields `undefined`, never throws.
 */
const readRawFrontmatter = (fileContent: string): unknown => {
  const body = extractFrontmatterBody(fileContent);
  if (body === null) {
    return undefined;
  }

  try {
    return parseYamlDocument(body);
  } catch {
    return undefined;
  }
};

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toOptionalStringArray = (
  value: unknown,
): readonly string[] | undefined => (Array.isArray(value) ? value : undefined);

/**
 * @description Parses `name`, `description`, optional `disable-model-invocation`, optional `tags`, and optional typed `arguments` (from `metadata.openthrottle-arguments`) from SKILL.md frontmatter. Provenance is NOT frontmatter — it is derived from the skill-sync layout (see `walk-agent-assets-on-disk.ts` and `parse-skills-lock.ts`).
 * @public
 */
export const parseSkillFrontmatter = (
  fileContent: string,
): ParsedSkillFrontmatter => {
  const { fields } = parseYamlFrontmatter(fileContent);

  return {
    arguments: parseSkillArguments(readRawFrontmatter(fileContent)),
    description: toOptionalString(fields.description),
    disableModelInvocation:
      typeof fields['disable-model-invocation'] === 'boolean'
        ? fields['disable-model-invocation']
        : undefined,
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
