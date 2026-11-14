import * as React from 'react';
import { Link } from 'react-router';

import type { UsageSkillUsageFilterOptionsFragment } from '~/__generated__/graphql';
import type { SkillUsageScopeFilter } from '~/routing/usage/data/data.skill-usage-copy';
import { buildUsageSearch } from '~/routing/usage/utils/buildUsageSearch';
import {
  skillUsageCwdLabel,
  skillUsageRepoLabel,
} from '~/routing/usage/utils/skill-usage-labels';
import { skillUsageChipClass } from '~/routing/usage/utils/skillUsageChipClass';

export interface UsageSkillUsageRepoFilterProps {
  accountParam: string | null;
  filterOptions: UsageSkillUsageFilterOptionsFragment;
  providerParam: string | null;
  selectedCwd: string | null;
  selectedGitBranch: string | null;
  selectedRepo: string | null;
  selectedScope: SkillUsageScopeFilter;
}

/**
 * @description The project filter. Offers repositories by their normalized git
 * remote once any row in the window carries one; until then it falls back to
 * the deprecated working-directory chips, which foreign repos no longer send.
 * Picking either kind clears the other, so the two never narrow at once.
 */
export const UsageSkillUsageRepoFilter = (
  props: UsageSkillUsageRepoFilterProps,
): React.ReactElement | null => {
  const {
    accountParam,
    filterOptions,
    providerParam,
    selectedCwd,
    selectedGitBranch,
    selectedRepo,
    selectedScope,
  } = props;

  // Hooks

  // Setup
  const byRepo = filterOptions.repoIdentities.length > 0;
  const values = byRepo ? filterOptions.repoIdentities : filterOptions.cwds;
  const selected = byRepo ? selectedRepo : selectedCwd;
  const groupLabel = byRepo
    ? 'Filter skill usage by repository'
    : 'Filter skill usage by project path';
  const toSearch = (value: string | null): string => {
    return buildUsageSearch({
      account: accountParam,
      cwd: byRepo ? null : value,
      gitBranch: selectedGitBranch,
      provider: providerParam,
      repo: byRepo ? value : null,
      scope: selectedScope,
    });
  };

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (values.length === 0) {
    return null;
  }

  return (
    <div
      aria-label={groupLabel}
      className="flex flex-wrap gap-2"
      data-testid="UsageSkillUsageRepoFilter"
      role="group"
    >
      <Link
        aria-current={selected === null ? 'true' : undefined}
        className={skillUsageChipClass(selected === null)}
        to={toSearch(null)}
      >
        All projects
      </Link>
      {values.map((value) => {
        const active = value === selected;

        return (
          <Link
            aria-current={active ? 'true' : undefined}
            className={skillUsageChipClass(active)}
            key={value}
            title={value}
            to={toSearch(value)}
          >
            {byRepo ? skillUsageRepoLabel(value) : skillUsageCwdLabel(value)}
          </Link>
        );
      })}
    </div>
  );
};
