import { RULES_COPY } from '~/routing/rules/data/data.copy';
import {
  ATTACH_PROMPT_ACTION_TYPE,
  DEFAULT_ATTACH_PROMPT_PLACEMENT,
} from '~/routing/rules/data/data.rule-form-options';

/**
 * Formatters for the rules routing area — simple, testable pure functions.
 */

export const formatRulesDate = (date: string): string => {
  return new Date(date).toLocaleString();
};

const countList = (value: unknown): number => {
  return Array.isArray(value) ? value.length : 0;
};

const asString = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

/**
 * Builds a concise, human-readable one-line summary of a rule's action payload
 * for the rules table, so each row communicates the effect at a glance without
 * expanding the raw JSON. Falls back gracefully when the payload can't be
 * parsed.
 */
export const summarizeRuleAction = (
  actionType: string,
  actionPayloadJson: string,
): string => {
  let payload: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(actionPayloadJson);
    if (typeof parsed === 'object' && parsed !== null) {
      payload = { ...parsed };
    }
  } catch {
    return 'unparseable payload';
  }

  if (actionType === 'inject-task') {
    const skillSlug = asString(payload.skillSlug) || '(no skill)';
    const placement = asString(payload.placement) || 'first';
    return `${skillSlug} · ${placement}`;
  }

  if (actionType === ATTACH_PROMPT_ACTION_TYPE) {
    const promptType = asString(payload.promptType) || 'prompts';
    const reference =
      asString(payload.filePath) ||
      asString(payload.promptId).slice(0, 8) ||
      '(no prompt)';
    const placement =
      asString(payload.placement) || DEFAULT_ATTACH_PROMPT_PLACEMENT;
    return `${promptType}: ${reference} · ${placement}`;
  }

  if (actionType === 'availability-exception') {
    const allow = countList(payload.tagAllow) + countList(payload.slugAllow);
    const deny = countList(payload.tagDeny) + countList(payload.slugDeny);
    return `allow ${allow} · deny ${deny}`;
  }

  return actionType;
};

export interface RuleScopeStep {
  readonly kind:
    'environment' | 'global' | 'project' | 'repository' | 'status' | 'unknown';
  readonly label: string;
}

export interface RuleScopeSource {
  readonly environment?: string | null;
  readonly projectId?: string | null;
  readonly repositoryId?: string | null;
  readonly status?: string | null;
}

/**
 * @description The rule's narrowness as an ordered trail — Global, or the
 * repository name and/or project name, then environment, then status — for the
 * Scope column. An id missing from `repositoryNames` or `projectNames` reads as
 * the unknown repository or project.
 */
export const buildRuleScopeTrail = (
  rule: RuleScopeSource,
  repositoryNames: ReadonlyMap<string, string>,
  projectNames: ReadonlyMap<string, string>,
): RuleScopeStep[] => {
  const trail: RuleScopeStep[] = [];

  if (rule.repositoryId == null && rule.projectId == null) {
    trail.push({ kind: 'global', label: RULES_COPY.scopeGlobalLabel });
  }

  if (rule.repositoryId != null) {
    const repositoryName = repositoryNames.get(rule.repositoryId);
    trail.push(
      repositoryName === undefined
        ? { kind: 'unknown', label: RULES_COPY.scopeUnknownRepositoryLabel }
        : { kind: 'repository', label: repositoryName },
    );
  }

  if (rule.projectId != null) {
    const projectName = projectNames.get(rule.projectId);
    trail.push(
      projectName === undefined
        ? { kind: 'unknown', label: RULES_COPY.scopeUnknownProjectLabel }
        : { kind: 'project', label: projectName },
    );
  }

  if (rule.environment != null && rule.environment !== '') {
    trail.push({
      kind: 'environment',
      label: rule.environment,
    });
  }

  if (rule.status != null && rule.status !== '') {
    trail.push({ kind: 'status', label: rule.status });
  }

  return trail;
};
