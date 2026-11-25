import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import type { UsageSkillUsageFilterOptionsFragment } from '~/__generated__/graphql';
import { UsageBranchFilter } from '~/routing/usage/components/UsageBranchFilter';
import { UsageSkillUsageRepoFilter } from '~/routing/usage/components/UsageSkillUsageRepoFilter';
import type { SkillUsageScopeFilter } from '~/routing/usage/data/skill-usage-copy';
import { SKILL_USAGE_SCOPES } from '~/routing/usage/data/skill-usage-copy';
import type { UsageBranchOption } from '~/routing/usage/types';
import { buildUsageSearch } from '~/routing/usage/utils/buildUsageSearch';
import { skillUsageChipClass } from '~/routing/usage/utils/skillUsageChipClass';

export interface UsageSkillUsageFiltersProps {
  /** SSR first page of branches: default branch first, then A–Z. */
  branchOptions: readonly UsageBranchOption[];
  /** The SSR branch page was truncated, so the list is not exhaustive. */
  branchesHaveMore: boolean;
  className?: string;
  /** Range end (YYYY-MM-DD) the branch search runs over. */
  end: string;
  filterOptions: UsageSkillUsageFilterOptionsFragment;
  selectedCwd: string | null;
  selectedGitBranch: string | null;
  selectedRepo: string | null;
  selectedScope: SkillUsageScopeFilter;
  /** Range start (YYYY-MM-DD) the branch search runs over. */
  start: string;
}

export const UsageSkillUsageFilters = (
  props: UsageSkillUsageFiltersProps,
): React.ReactElement => {
  const {
    branchOptions,
    branchesHaveMore,
    className,
    end,
    filterOptions,
    selectedCwd,
    selectedGitBranch,
    selectedRepo,
    selectedScope,
    start,
  } = props;

  // Hooks

  // Setup
  const scopeFilters: ReadonlyArray<{
    id: SkillUsageScopeFilter;
    label: string;
  }> = [
    { id: null, label: 'All scopes' },
    { id: SKILL_USAGE_SCOPES.OURS, label: 'Ours' },
    { id: SKILL_USAGE_SCOPES.INJECTED, label: 'Injected' },
    { id: SKILL_USAGE_SCOPES.PERSONAL, label: 'Personal' },
    { id: SKILL_USAGE_SCOPES.THIRD_PARTY, label: 'Third-party' },
  ];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn(className)} data-testid="UsageSkillUsageFilters">
      <div
        aria-label="Filter skill usage by scope"
        className="mb-4 flex flex-wrap gap-2"
        role="group"
      >
        {scopeFilters.map((option) => {
          const active = option.id === selectedScope;

          return (
            <Link
              aria-current={active ? 'true' : undefined}
              className={skillUsageChipClass(active)}
              key={option.label}
              to={buildUsageSearch({
                cwd: selectedCwd,
                gitBranch: selectedGitBranch,
                repo: selectedRepo,
                scope: option.id,
              })}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      <div className="mb-6 flex flex-col gap-3">
        <UsageBranchFilter
          end={end}
          hasMore={branchesHaveMore}
          initialOptions={branchOptions}
          selectedCwd={selectedCwd}
          selectedGitBranch={selectedGitBranch}
          selectedRepo={selectedRepo}
          selectedScope={selectedScope}
          start={start}
        />

        <UsageSkillUsageRepoFilter
          filterOptions={filterOptions}
          selectedCwd={selectedCwd}
          selectedGitBranch={selectedGitBranch}
          selectedRepo={selectedRepo}
          selectedScope={selectedScope}
        />
      </div>
    </div>
  );
};
