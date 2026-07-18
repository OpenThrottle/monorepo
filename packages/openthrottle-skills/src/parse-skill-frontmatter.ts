import { parseYamlFrontmatter } from './frontmatter/parse-yaml-frontmatter.ts';
import type {
  SkillFrontmatter,
  SkillSource,
} from './schemas/agent-asset-frontmatter.schemas.ts';

export interface ParsedSkillFrontmatter {
  readonly description: string | undefined;
  readonly disableModelInvocation: boolean | undefined;
  readonly name: string | undefined;
  readonly source: SkillSource;
  readonly sourceUrl: string | undefined;
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
): readonly string[] | undefined => (Array.isArray(value) ? value : undefined);

// Conservative default: only an explicit `source: openthrottle` claims a skill
// as ours; anything else (omitted, garbage, wrong type) reads as external.
const toSkillSource = (value: unknown): SkillSource =>
  typeof value === 'string' && value.trim().toLowerCase() === 'openthrottle'
    ? 'openthrottle'
    : 'external';

/**
 * @description Parses `name`, `description`, optional `disable-model-invocation`, optional `tags`, and provenance (`source`/`sourceUrl`) from SKILL.md frontmatter.
 * @public
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
    source: toSkillSource(fields.source),
    sourceUrl: toOptionalString(fields.sourceUrl),
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
  if (fields.source !== undefined) {
    result.source = fields.source;
  }
  if (fields.sourceUrl !== undefined) {
    result.sourceUrl = fields.sourceUrl;
  }
  if (fields.tags !== undefined) {
    result.tags = fields.tags;
  }

  return result;
};

export type { SkillFrontmatter };
