import * as React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import {
  SKILL_USAGE_SCOPES,
  skillUsageCwdLabel,
  type SkillUsageScopeFilter,
} from '~/routing/usage/data/skill-usage-copy';
import { skillUsageChipClass } from '~/routing/usage/utils/skill-usage-chip-class';
import { UsageBranchFilter } from '~/routing/usage/components/UsageBranchFilter';
import { buildUsageSearch } from '~/routing/usage/utils/usage-search';
import type { UsageBranchOption } from '~/routing/usage/hooks/useUsageBranchSearch';
import type { UsageSkillUsageFilterOptionsFragment } from '~/__generated__/graphql';

export interface UsageSkillUsageFiltersProps {
  /** SSR first page of branches: default branch first, then A–Z. */
  branchOptions: readonly UsageBranchOption[];
  /** The SSR branch page was truncated, so the list is not exhaustive. */
  branchesHaveMore: boolean;
  className?: string;
  /** Range end (YYYY-MM-DD) the branch search runs over. */
  end: string;
  filterOptions: UsageSkillUsageFilterOptionsFragment;
  /** Current `?provider=` (token usage); preserved when skill filters change. */
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
    { id: SKILL_USAGE_SCOPES.THIRD_PARTY, label: 'Third-party' },
  ];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx(className)} data-testid="UsageSkillUsageFilters">
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
