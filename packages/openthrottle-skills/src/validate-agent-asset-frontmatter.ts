import type { ZodError } from 'zod';

import { parsePersonaFrontmatterForValidation } from './parse-persona-frontmatter.js';
import { parseRuleFrontmatterForValidation } from './parse-rule-frontmatter.js';
import { parseSkillFrontmatterForValidation } from './parse-skill-frontmatter.js';
import type {
  AgentAssetKind,
  AgentAssetValidationIssue,
} from './schemas/agent-asset-frontmatter.schemas.js';
import {
  personaFrontmatterSchema,
  ruleFrontmatterSchema,
  skillFrontmatterSchema,
} from './schemas/agent-asset-frontmatter.schemas.js';

const zodIssuesToValidationIssues = (
  path: string,
  severity: 'error' | 'warning',
  error: ZodError,
): AgentAssetValidationIssue[] =>
  error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
    path,
    severity,
  }));

const validateRuleFrontmatterWarnings = (
  path: string,
  parsed: Record<string, unknown>,
): AgentAssetValidationIssue[] => {
  const warnings: AgentAssetValidationIssue[] = [];

  const description = parsed.description;
  if (
    description === undefined ||
    (typeof description === 'string' && description.trim().length === 0)
  ) {
    warnings.push({
      field: 'description',
      message:
        'Rule frontmatter description is empty (recommended for discoverability)',
      path,
      severity: 'warning',
    });
  }

  const globs = parsed.globs;
  const alwaysApply = parsed.alwaysApply;
  if (
    alwaysApply !== true &&
    (globs === undefined ||
      (typeof globs === 'string' && globs.trim().length === 0))
  ) {
    warnings.push({
      field: 'globs',
      message:
        'Rule has no globs and alwaysApply is not true (may not attach to files)',
      path,
      severity: 'warning',
    });
  }

  if (alwaysApply !== undefined && typeof alwaysApply !== 'boolean') {
    warnings.push({
      field: 'alwaysApply',
      message: 'alwaysApply must be a boolean when present',
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
 * @publicApi
 */
export const validateAgentAssetFrontmatter = (
  input: ValidateAgentAssetFrontmatterInput,
): ValidateAgentAssetFrontmatterResult => {
  const { content, expectedSlug, kind, path } = input;

  if (kind === 'skill') {
    const parsed = parseSkillFrontmatterForValidation(content);
    const result = skillFrontmatterSchema.safeParse(parsed);
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
        message: `Frontmatter name "${result.data.name}" must match directory slug "${expectedSlug}"`,
        path,
        severity: 'error',
      });
    }

    return { errors, warnings: [] };
  }

  if (kind === 'persona') {
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
  }

  const parsed = parseRuleFrontmatterForValidation(content);
  const result = ruleFrontmatterSchema.safeParse(parsed);
  const warnings = validateRuleFrontmatterWarnings(path, parsed);

  if (!result.success) {
    return {
      errors: [],
      warnings: [
        ...warnings,
        ...zodIssuesToValidationIssues(path, 'warning', result.error),
      ],
    };
  }

  return { errors: [], warnings };
};

export interface ValidateAgentAssetsResult {
  readonly errors: readonly AgentAssetValidationIssue[];
  readonly warnings: readonly AgentAssetValidationIssue[];
}

/**
 * @description Validates frontmatter for multiple agent asset files.
 * @publicApi
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
