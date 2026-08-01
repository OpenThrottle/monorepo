import * as React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import {
  SKILL_USAGE_SCOPES,
  skillUsageCwdLabel,
  type SkillUsageScopeFilter,
} from '~/routing/usage/data/skill-usage-copy';
import { skillUsageChipClass } from '~/routing/usage/utils/skill-usage-chip-class';
import { buildUsageSearch } from '~/routing/usage/utils/usage-search';
import type { UsageSkillUsageFilterOptionsFragment } from '~/__generated__/graphql';

export interface UsageSkillUsageFiltersProps {
  className?: string;
  filterOptions: UsageSkillUsageFilterOptionsFragment;
  /** Current `?provider=` (token usage); preserved when skill filters change. */
  providerParam: string | null;
  selectedCwd: string | null;
  selectedGitBranch: string | null;
  selectedScope: SkillUsageScopeFilter;
}

export const UsageSkillUsageFilters = (
  props: UsageSkillUsageFiltersProps,
): React.ReactElement => {
  const {
    className,
    filterOptions,
    providerParam,
    selectedCwd,
    selectedGitBranch,
    selectedScope,
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

      {(filterOptions.gitBranches.length > 0 ||
        filterOptions.cwds.length > 0) && (
        <div className="mb-6 flex flex-col gap-3">
          {filterOptions.gitBranches.length > 0 && (
            <div
              aria-label="Filter skill usage by branch"
              className="flex flex-wrap gap-2"
              role="group"
            >
              <Link
                aria-current={selectedGitBranch === null ? 'true' : undefined}
                className={skillUsageChipClass(selectedGitBranch === null)}
                to={buildUsageSearch({
                  cwd: selectedCwd,
                  gitBranch: null,
                  provider: providerParam,
                  scope: selectedScope,
                })}
              >
                All branches
              </Link>
              {filterOptions.gitBranches.map((branch) => {
                const active = branch === selectedGitBranch;

                return (
                  <Link
                    aria-current={active ? 'true' : undefined}
                    className={skillUsageChipClass(active)}
                    key={branch}
                    to={buildUsageSearch({
                      cwd: selectedCwd,
                      gitBranch: branch,
                      provider: providerParam,
                      scope: selectedScope,
                    })}
                  >
                    {branch}
                  </Link>
                );
              })}
            </div>
          )}

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
      )}
    </div>
  );
};
