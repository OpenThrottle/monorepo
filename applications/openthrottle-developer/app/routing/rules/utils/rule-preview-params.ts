import { ANY, ENVIRONMENTS } from '~/routing/rules/data/data.rule-form-options';

/** The match fields a preview reads; the action payload never matters. */
export interface RulePreviewMatch {
  readonly actionType: string;
  readonly environment: string | null;
  readonly repositoryId: string | null;
  readonly status: string | null;
  readonly tagAll: readonly string[];
}

/** A preview request: the rule's match fields plus the environment to evaluate in. */
export interface RulePreviewRequest {
  readonly evaluateEnvironment: string | null;
  readonly match: RulePreviewMatch;
}

/** Maps the form's "any" sentinel and blanks to null. */
export const normalizeRuleFormChoice = (
  value: string | null,
): string | null => {
  if (value == null || value === '' || value === ANY) return null;
  return value;
};

/** Narrows a raw value to a known environment, else null. */
export const parseRulePreviewEnvironment = (
  value: string | null,
): string | null => {
  const choice = normalizeRuleFormChoice(value);
  if (choice == null) return null;
  return ENVIRONMENTS.includes(choice) ? choice : null;
};

/** Serializes a preview request to the resource route's query string. */
export const buildRulePreviewQuery = (request: RulePreviewRequest): string => {
  const { evaluateEnvironment, match } = request;
  const params = new URLSearchParams();
  params.set('actionType', match.actionType);
  if (match.environment != null) params.set('environment', match.environment);
  if (evaluateEnvironment != null) {
    params.set('evaluateEnvironment', evaluateEnvironment);
  }
  if (match.repositoryId != null) {
    params.set('repositoryId', match.repositoryId);
  }
  if (match.status != null) params.set('status', match.status);
  for (const tag of match.tagAll) {
    params.append('tagAll', tag);
  }
  return params.toString();
};

/** Parses the resource route's query string back into a preview request. */
export const parseRulePreviewQuery = (
  params: URLSearchParams,
): RulePreviewRequest => {
  return {
    evaluateEnvironment: parseRulePreviewEnvironment(
      params.get('evaluateEnvironment'),
    ),
    match: {
      actionType: params.get('actionType') ?? '',
      environment: normalizeRuleFormChoice(params.get('environment')),
      repositoryId: normalizeRuleFormChoice(params.get('repositoryId')),
      status: normalizeRuleFormChoice(params.get('status')),
      tagAll: params.getAll('tagAll'),
    },
  };
};
