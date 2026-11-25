import type { ZodError } from 'zod';

import type {
  AgentAssetKind,
  AgentAssetValidationIssue,
  SkillOutcomeTelemetry,
} from './utils/agent-asset-frontmatter-schemas.ts';
import {
  personaFrontmatterSchema,
  SKILL_OUTCOME_TELEMETRY,
  skillFrontmatterSchema,
} from './utils/agent-asset-frontmatter-schemas.ts';
import {
  parseYamlFrontmatter,
  parseYamlFrontmatterMetadata,
} from './utils/frontmatter.ts';

const OUTCOME_TELEMETRY_KEY = 'outcome-telemetry';

export interface ParsedSkillFrontmatter {
  readonly description: string | undefined;
  readonly disableModelInvocation: boolean | undefined;
  readonly name: string | undefined;
  /** `metadata.outcome-telemetry`; `undefined` when absent or unrecognized. */
  readonly outcomeTelemetry: SkillOutcomeTelemetry | undefined;
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

const isSkillOutcomeTelemetry = (
  value: unknown,
): value is SkillOutcomeTelemetry => {
  return SKILL_OUTCOME_TELEMETRY.some((known) => known === value);
};

const readOutcomeTelemetry = (fileContent: string): unknown => {
  return parseYamlFrontmatterMetadata(fileContent).fields[
    OUTCOME_TELEMETRY_KEY
  ];
};

/**
 * @description Parses `name`, `description`, optional `disable-model-invocation`, optional `tags`, and the optional nested `metadata.outcome-telemetry` from SKILL.md frontmatter. Provenance is NOT frontmatter — it is derived from the ot-skill-sync layout (see `agent-assets-disk.ts` and `parse-skills-lock.ts`).
 * @public
 */
export const parseSkillFrontmatter = (
  fileContent: string,
): ParsedSkillFrontmatter => {
  const { fields } = parseYamlFrontmatter(fileContent);
  const rawFlag = fields['disable-model-invocation'];
  const isBoolean = typeof rawFlag === 'boolean';
  const disableModelInvocation = isBoolean ? rawFlag : undefined;
  const rawOutcomeTelemetry = readOutcomeTelemetry(fileContent);
  const isKnownOutcomeTelemetry = isSkillOutcomeTelemetry(rawOutcomeTelemetry);
  const outcomeTelemetry = isKnownOutcomeTelemetry
    ? rawOutcomeTelemetry
    : undefined;

  return {
    description: toOptionalString(fields.description),
    disableModelInvocation,
    name: toOptionalString(fields.name),
    outcomeTelemetry,
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

export interface ParsedPersonaFrontmatter {
  readonly description: string | undefined;
  readonly name: string | undefined;
}

/**
 * @description Parses persona frontmatter from `.agents/personas/*.md`.
 * @public
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
 * @public
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

const zodIssuesToValidationIssues = (
  path: string,
  severity: 'error' | 'warning',
  error: ZodError,
): AgentAssetValidationIssue[] => {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
    path,
    severity,
  }));
};

const validateSkillFrontmatterWarnings = (
  path: string,
  parsed: Record<string, unknown>,
  content: string,
): AgentAssetValidationIssue[] => {
  const warnings: AgentAssetValidationIssue[] = [];

  const outcomeTelemetry = readOutcomeTelemetry(content);
  if (
    outcomeTelemetry !== undefined &&
    !isSkillOutcomeTelemetry(outcomeTelemetry)
  ) {
    warnings.push({
      field: `metadata.${OUTCOME_TELEMETRY_KEY}`,
      message: `metadata.${OUTCOME_TELEMETRY_KEY} must be one of ${SKILL_OUTCOME_TELEMETRY.map((value) => `'${value}'`).join(', ')}; any other value is ignored and the skill reads as unmeasured`,
      path,
      severity: 'warning',
    });
  }

  const disableModelInvocation = parsed['disable-model-invocation'];
  if (
    disableModelInvocation !== undefined &&
    typeof disableModelInvocation !== 'boolean'
  ) {
    warnings.push({
      field: 'disable-model-invocation',
      message: `disable-model-invocation must be true or false; a non-boolean value is ignored and the intent is lost`,
      path,
      severity: 'warning',
    });
  }

  return warnings;
};

export interface ValidateAgentAssetFrontmatterInput {
  readonly content: string;
  readonly expectedSlug?: string;
  readonly kind: AgentAssetKind;
  readonly path: string;
}

export interface ValidateAgentAssetFrontmatterResult {
  readonly errors: readonly AgentAssetValidationIssue[];
  readonly warnings: readonly AgentAssetValidationIssue[];
}

/**
 * @description Validates frontmatter for a single agent asset file per D5 enforcement.
 * @public
 */
export const validateAgentAssetFrontmatter = (
  input: ValidateAgentAssetFrontmatterInput,
): ValidateAgentAssetFrontmatterResult => {
  const { content, expectedSlug, kind, path } = input;

  if (kind === 'prompt') {
    return { errors: [], warnings: [] };
  }

  if (kind === 'skill') {
    const parsed = parseSkillFrontmatterForValidation(content);
    const warnings = validateSkillFrontmatterWarnings(path, parsed, content);
    const result = skillFrontmatterSchema.safeParse(parsed);
    if (!result.success) {
      return {
        errors: zodIssuesToValidationIssues(path, 'error', result.error),
        warnings,
      };
    }

    const errors: AgentAssetValidationIssue[] = [];
    if (expectedSlug !== undefined && result.data.name !== expectedSlug) {
      errors.push({
        field: 'name',
        message: `Frontmatter name "${result.data.name}" must match directory slug "${expectedSlug}"`,
        path,
        severity: 'error',
      });
    }

    return { errors, warnings };
  }

  // Personas are the remaining kind, so this is the fall-through rather than a
  // fourth branch — `AgentAssetKind` has exactly three members.
  const parsed = parsePersonaFrontmatterForValidation(content);
  const result = personaFrontmatterSchema.safeParse(parsed);
  if (!result.success) {
    return {
      errors: zodIssuesToValidationIssues(path, 'error', result.error),
      warnings: [],
    };
  }

  const errors: AgentAssetValidationIssue[] = [];
  if (expectedSlug !== undefined && result.data.name !== expectedSlug) {
    errors.push({
      field: 'name',
      message: `Frontmatter name "${result.data.name}" must match filename id "${expectedSlug}"`,
      path,
      severity: 'error',
    });
  }

  return { errors, warnings: [] };
};

export interface ValidateAgentAssetsResult {
  readonly errors: readonly AgentAssetValidationIssue[];
  readonly warnings: readonly AgentAssetValidationIssue[];
}

/**
 * @description Validates frontmatter for multiple agent asset files.
 * @public
 */
export const mergeValidationResults = (
  results: readonly ValidateAgentAssetFrontmatterResult[],
): ValidateAgentAssetsResult => {
  const errors: AgentAssetValidationIssue[] = [];
  const warnings: AgentAssetValidationIssue[] = [];

  for (const result of results) {
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  return { errors, warnings };
};
