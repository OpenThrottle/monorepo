import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import type { UsageSkillUsageFilterOptionsFragment } from '~/__generated__/graphql';
import { UsageBranchFilter } from '~/routing/usage/components/UsageBranchFilter';
import {
  SKILL_USAGE_SCOPES,
  type SkillUsageScopeFilter,
} from '~/routing/usage/data/data.skill-usage-copy';
import type { UsageBranchOption } from '~/routing/usage/types';
import { buildUsageSearch } from '~/routing/usage/utils/buildUsageSearch';
import { skillUsageCwdLabel } from '~/routing/usage/utils/skill-usage-labels';
import { skillUsageChipClass } from '~/routing/usage/utils/skillUsageChipClass';

export interface UsageSkillUsageFiltersProps {
  /** Current `?provider=` (token usage); preserved when skill filters change. */
  /** `?account=` token-usage filter to preserve, or null. */
  accountParam?: string | null;
  /** SSR first page of branches: default branch first, then A–Z. */
  branchOptions: readonly UsageBranchOption[];
  /** The SSR branch page was truncated, so the list is not exhaustive. */
  branchesHaveMore: boolean;
  className?: string;
  /** Range end (YYYY-MM-DD) the branch search runs over. */
  end: string;
  filterOptions: UsageSkillUsageFilterOptionsFragment;
  providerParam: string | null;
  selectedCwd: string | null;
  selectedGitBranch: string | null;
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
    accountParam = null,
    providerParam,
    selectedCwd,
    selectedGitBranch,
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
                account: accountParam,
                cwd: selectedCwd,
                gitBranch: selectedGitBranch,
                provider: providerParam,
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
          accountParam={accountParam}
          end={end}
          hasMore={branchesHaveMore}
          initialOptions={branchOptions}
          providerParam={providerParam}
          selectedCwd={selectedCwd}
          selectedGitBranch={selectedGitBranch}
          selectedScope={selectedScope}
          start={start}
        />

        {filterOptions.cwds.length > 0 && (
          <div
            aria-label="Filter skill usage by project path"
            className="flex flex-wrap gap-2"
            role="group"
          >
            <Link
              aria-current={selectedCwd === null ? 'true' : undefined}
              className={skillUsageChipClass(selectedCwd === null)}
              to={buildUsageSearch({
                account: accountParam,
                cwd: null,
                gitBranch: selectedGitBranch,
                provider: providerParam,
                scope: selectedScope,
              })}
            >
              All projects
            </Link>
            {filterOptions.cwds.map((cwd) => {
              const active = cwd === selectedCwd;

              return (
                <Link
                  aria-current={active ? 'true' : undefined}
                  className={skillUsageChipClass(active)}
                  key={cwd}
                  title={cwd}
                  to={buildUsageSearch({
                    account: accountParam,
                    cwd,
                    gitBranch: selectedGitBranch,
                    provider: providerParam,
                    scope: selectedScope,
                  })}
                >
                  {skillUsageCwdLabel(cwd)}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
