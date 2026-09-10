import type { ZodError } from 'zod';

import { parsePersonaFrontmatterForValidation } from './parse-persona-frontmatter.ts';
import { parseSkillFrontmatterForValidation } from './parse-skill-frontmatter.ts';
import type {
  AgentAssetKind,
  AgentAssetValidationIssue,
} from './schemas/agent-asset-frontmatter.schemas.ts';
import {
  personaFrontmatterSchema,
  skillFrontmatterSchema,
} from './schemas/agent-asset-frontmatter.schemas.ts';

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

const validateSkillFrontmatterWarnings = (
  path: string,
  parsed: Record<string, unknown>,
): AgentAssetValidationIssue[] => {
  const warnings: AgentAssetValidationIssue[] = [];

  const disableModelInvocation = parsed['disable-model-invocation'];
  if (
    disableModelInvocation !== undefined &&
    typeof disableModelInvocation !== 'boolean'
  ) {
    warnings.push({
      field: 'disable-model-invocation',
      message:
        'disable-model-invocation must be true or false; a non-boolean value is ignored and the intent is lost',
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
    const warnings = validateSkillFrontmatterWarnings(path, parsed);
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
