import type { TagActionRuleRowFragment } from '~/__generated__/graphql';

/** A rule row plus the evaluator's specificity score, attached by the loader. */
export interface RankedTagActionRule extends TagActionRuleRowFragment {
  readonly specificity: number;
}

export interface RulesRepositoryOption {
  readonly id: string;
  readonly name: string;
}

/**
 * @description One rung of the hierarchy: Global rules, a named repository, or
 * the catch-all for rules pointing at a repository the user no longer lists.
 */
export interface RuleGroup<T extends RankedTagActionRule> {
  readonly id: string;
  readonly kind: 'global' | 'repository' | 'unknown';
  readonly repositoryName: string | null;
  readonly rules: T[];
}

export interface RuleScopeCounts {
  readonly global: number;
  readonly repository: number;
}

const GLOBAL_GROUP_ID = 'global';
const UNKNOWN_GROUP_ID = 'unknown';

/**
 * @description Narrowest first by the provided `specificity` (descending), then
 * `createdAt` ascending, then id — the same tie-break the evaluator uses.
 */
export const compareRulesNarrowestFirst = (
  left: RankedTagActionRule,
  right: RankedTagActionRule,
): number => {
  const bySpecificity = right.specificity - left.specificity;
  if (bySpecificity !== 0) {
    return bySpecificity;
  }

  const byAge =
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  if (byAge !== 0) {
    return byAge;
  }

  return left.id.localeCompare(right.id);
};

/**
 * @description Groups rules: Global first, then one group per repository ordered
 * by name, then an "unknown repository" group for dangling repository ids. Rules
 * inside each group are narrowest first. Empty groups are omitted; pure.
 */
export const groupRulesByRepository = <T extends RankedTagActionRule>(
  rules: readonly T[],
  repositories: readonly RulesRepositoryOption[],
): RuleGroup<T>[] => {
  const names = new Map(repositories.map((repo) => [repo.id, repo.name]));
  const sorted = [...rules].sort(compareRulesNarrowestFirst);
  const globalRules = sorted.filter((rule) => rule.repositoryId == null);
  const unknownRules = sorted.filter((rule) => {
    return rule.repositoryId != null && !names.has(rule.repositoryId);
  });
  const repositoryGroups = [...repositories]
    .sort((left, right) => {
      return (
        left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
      );
    })
    .map((repo): RuleGroup<T> => {
      return {
        id: repo.id,
        kind: 'repository',
        repositoryName: repo.name,
        rules: sorted.filter((rule) => rule.repositoryId === repo.id),
      };
    });

  const groups: RuleGroup<T>[] = [
    {
      id: GLOBAL_GROUP_ID,
      kind: 'global',
      repositoryName: null,
      rules: globalRules,
    },
    ...repositoryGroups,
    {
      id: UNKNOWN_GROUP_ID,
      kind: 'unknown',
      repositoryName: null,
      rules: unknownRules,
    },
  ];

  return groups.filter((group) => group.rules.length > 0);
};

/** @description Global vs repository-scoped rule counts for the stats panel. */
export const countRulesByScope = (
  rules: readonly { readonly repositoryId?: string | null }[],
): RuleScopeCounts => {
  const global = rules.filter((rule) => rule.repositoryId == null).length;

  return { global, repository: rules.length - global };
};
