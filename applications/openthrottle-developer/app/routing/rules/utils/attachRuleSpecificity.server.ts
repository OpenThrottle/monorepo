import { scoreTagActionSpecificity } from '@openthrottle/openthrottle-skills';

export interface SpecificityScorable {
  readonly environment?: string | null;
  readonly repositoryId?: string | null;
  readonly status?: string | null;
  readonly tagAll: readonly string[];
}

/**
 * @description Attaches the evaluator's specificity score (higher is narrower)
 * to each rule. Server-only on purpose: the `@openthrottle/openthrottle-skills`
 * main entry also exports Node-only disk readers, so the client never imports it
 * and orders rows from the `specificity` the loader returns instead.
 */
export const attachRuleSpecificity = <T extends SpecificityScorable>(
  rules: readonly T[],
): Array<T & { readonly specificity: number }> => {
  return rules.map((rule) => {
    const specificity = scoreTagActionSpecificity({
      environment: rule.environment ?? null,
      repositoryId: rule.repositoryId ?? null,
      status: rule.status ?? null,
      tagAll: rule.tagAll,
    });

    return { ...rule, specificity };
  });
};
