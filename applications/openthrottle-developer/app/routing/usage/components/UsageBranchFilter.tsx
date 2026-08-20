import * as React from 'react';
import clsx from 'clsx';
import { Combobox } from '@openthrottle/react-router-shadcn';
import { useNavigate } from 'react-router';
import {
  BRANCH_FILTER_ALL_VALUE,
  BRANCH_FILTER_COPY,
} from '~/routing/usage/data/branch-filter-copy';
import { buildUsageSearch } from '~/routing/usage/utils/usage-search';
import { useUsageBranchSearch } from '~/routing/usage/hooks/useUsageBranchSearch';
import type { ComboboxOption } from '@openthrottle/react-router-shadcn';
import type { SkillUsageScopeFilter } from '~/routing/usage/data/skill-usage-copy';
import type { UsageBranchOption } from '~/routing/usage/hooks/useUsageBranchSearch';

export interface UsageBranchFilterProps {
  className?: string;
  /** Range end (YYYY-MM-DD) the branch search runs over. */
  end: string;
  /** The SSR first page was truncated, so the list is not exhaustive. */
  hasMore: boolean;
  /** SSR first page: default branch first, then A–Z. */
  initialOptions: readonly UsageBranchOption[];
  /** Current `?provider=` (token usage); preserved when the branch changes. */
  providerParam: string | null;
  selectedCwd: string | null;
  selectedGitBranch: string | null;
  selectedScope: SkillUsageScopeFilter;
  /** Range start (YYYY-MM-DD) the branch search runs over. */
  start: string;
}

export const UsageBranchFilter = (
  props: UsageBranchFilterProps,
): React.ReactElement => {
  const {
    className,
    end,
    hasMore,
    initialOptions,
    providerParam,
    selectedCwd,
    selectedGitBranch,
    selectedScope,
    start,
  } = props;

  // Hooks
  const navigate = useNavigate();
  const search = useUsageBranchSearch({
    end,
    initialHasMore: hasMore,
    initialOptions,
    start,
  });

  // Setup
  // The selected branch is appended when the current search excludes it, so the
  // trigger always shows the active filter and can always be cleared.
  const options: readonly ComboboxOption[] = React.useMemo(() => {
    const matched = search.options.map((option) => ({
      hint: option.count.toLocaleString(),
      label: option.branch,
      value: option.branch,
    }));
    const missingSelection =
      selectedGitBranch !== null &&
      !matched.some((option) => option.value === selectedGitBranch);

    return [
      { label: BRANCH_FILTER_COPY.all, value: BRANCH_FILTER_ALL_VALUE },
      ...matched,
      ...(missingSelection
        ? [{ label: selectedGitBranch, value: selectedGitBranch }]
        : []),
    ];
  }, [search.options, selectedGitBranch]);

  // Handlers
  const handleValueChange = (value: string): void => {
    navigate(
      buildUsageSearch({
        cwd: selectedCwd,
        gitBranch: value === BRANCH_FILTER_ALL_VALUE ? null : value,
        provider: providerParam,
        scope: selectedScope,
      }),
    );
  };

  // Markup
  const footer =
    search.hasMore && search.options.length > 0 ? (
      <div className="text-muted-foreground border-t px-3 py-2 text-xs">
        {BRANCH_FILTER_COPY.truncated(search.options.length)}
      </div>
    ) : null;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx(className)} data-testid="UsageBranchFilter">
      <span className="text-muted-foreground mb-1 block text-xs font-medium">
        {BRANCH_FILTER_COPY.label}
      </span>
      <Combobox
        className="w-full sm:w-72"
        emptyText={BRANCH_FILTER_COPY.empty}
        footer={footer}
        loading={search.loading}
        loadingText={BRANCH_FILTER_COPY.loading}
        onSearchChange={search.onSearchChange}
        onValueChange={handleValueChange}
        options={options}
        placeholder={BRANCH_FILTER_COPY.placeholder}
        searchPlaceholder={BRANCH_FILTER_COPY.searchPlaceholder}
        searchValue={search.search}
        shouldFilter={false}
        value={selectedGitBranch ?? BRANCH_FILTER_ALL_VALUE}
      />
    </div>
  );
};
