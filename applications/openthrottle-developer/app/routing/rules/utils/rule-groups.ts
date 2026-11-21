import type { TagActionRuleRowFragment } from '~/__generated__/graphql';

/** A rule row plus the evaluator's specificity score, attached by the loader. */
export interface RankedTagActionRule extends TagActionRuleRowFragment {
  readonly specificity: number;
}

export interface RulesRepositoryOption {
  readonly id: string;
  readonly name: string;
}

export interface RulesProjectOption {
  readonly id: string;
  readonly name: string;
}

/**
 * @description One rung of the hierarchy: Global rules, a named repository, a
 * named project (rules with a project but no repository), or the catch-all for
 * rules pointing at a repository or project the user no longer lists.
 */
export interface RuleGroup<T extends RankedTagActionRule> {
  readonly id: string;
  readonly kind: 'global' | 'project' | 'repository' | 'unknown';
  readonly projectName: string | null;
  readonly repositoryName: string | null;
  readonly rules: T[];
}

export interface RuleScopeCounts {
  readonly global: number;
  readonly project: number;
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

const byNameThenId = (
  left: { readonly id: string; readonly name: string },
  right: { readonly id: string; readonly name: string },
): number => {
  return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
};

/**
 * @description Groups rules: Global first (no repository and no project), then
 * one group per project ordered by name (rules scoped to a project only), then
 * one group per repository ordered by name (a rule with a repository lands here
 * even when it also names a project), then an "unknown" group for dangling
 * repository or project ids. Rules inside each group are narrowest first. Empty
 * groups are omitted; pure.
 */
export const groupRulesByRepository = <T extends RankedTagActionRule>(
  rules: readonly T[],
  repositories: readonly RulesRepositoryOption[],
  projects: readonly RulesProjectOption[],
): RuleGroup<T>[] => {
  const repositoryIds = new Set(repositories.map((repo) => repo.id));
  const projectIds = new Set(projects.map((project) => project.id));
  const sorted = [...rules].sort(compareRulesNarrowestFirst);
  const globalRules = sorted.filter((rule) => {
    return rule.repositoryId == null && rule.projectId == null;
  });
  const unknownRules = sorted.filter((rule) => {
    if (rule.repositoryId != null) {
      return !repositoryIds.has(rule.repositoryId);
    }

    return rule.projectId != null && !projectIds.has(rule.projectId);
  });
  const projectGroups = [...projects]
    .sort(byNameThenId)
    .map((project): RuleGroup<T> => {
      return {
        id: project.id,
        kind: 'project',
        projectName: project.name,
        repositoryName: null,
        rules: sorted.filter((rule) => {
          return rule.repositoryId == null && rule.projectId === project.id;
        }),
      };
    });
  const repositoryGroups = [...repositories]
    .sort(byNameThenId)
    .map((repo): RuleGroup<T> => {
      return {
        id: repo.id,
        kind: 'repository',
        projectName: null,
        repositoryName: repo.name,
        rules: sorted.filter((rule) => rule.repositoryId === repo.id),
      };
    });

  const groups: RuleGroup<T>[] = [
    {
      id: GLOBAL_GROUP_ID,
      kind: 'global',
      projectName: null,
      repositoryName: null,
      rules: globalRules,
    },
    ...projectGroups,
    ...repositoryGroups,
    {
      id: UNKNOWN_GROUP_ID,
      kind: 'unknown',
      projectName: null,
      repositoryName: null,
      rules: unknownRules,
    },
  ];

  return groups.filter((group) => group.rules.length > 0);
};

/**
 * @description Scope counts for the stats panel: Global (no repository, no
 * project), repository-scoped, and project-only rules.
 */
export const countRulesByScope = (
  rules: readonly {
    readonly projectId?: string | null;
    readonly repositoryId?: string | null;
  }[],
): RuleScopeCounts => {
  const global = rules.filter((rule) => {
    return rule.repositoryId == null && rule.projectId == null;
  }).length;
  const repository = rules.filter((rule) => rule.repositoryId != null).length;

  return { global, project: rules.length - global - repository, repository };
};
