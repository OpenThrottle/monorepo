import * as React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import { TOKEN_USAGE_PROVIDERS } from '~/routing/usage/data/token-usage-copy';
import { buildUsageSearch } from '~/routing/usage/utils/usage-search';

export interface UsageTokenUsageFiltersProps {
  className?: string;
  selectedProvider: string | null;
  /** Skill-usage search params to preserve when changing provider. */
  skillCwdParam?: string | null;
  skillGitBranchParam?: string | null;
  skillScopeParam?: string | null;
}

export const UsageTokenUsageFilters = (
  props: UsageTokenUsageFiltersProps,
): React.ReactElement => {
  const {
    className,
    selectedProvider,
    skillCwdParam = null,
    skillGitBranchParam = null,
    skillScopeParam = null,
  } = props;

  // Hooks

  // Setup
  const filterOptions: ReadonlyArray<{ id: string | null; label: string }> = [
    { id: null, label: 'All providers' },
    ...TOKEN_USAGE_PROVIDERS.map((provider) => ({
      id: provider.id,
      label: provider.label,
    })),
  ];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      aria-label="Filter usage by provider"
      className={clsx('mb-6 flex flex-wrap gap-2', className)}
      data-testid="UsageTokenUsageFilters"
      role="group"
    >
      {filterOptions.map((option) => {
        const active = option.id === selectedProvider;

        return (
          <Link
            aria-current={active ? 'true' : undefined}
            className={clsx(
              'rounded-full border px-3 py-1 text-xs transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground border-border',
            )}
            key={option.label}
            to={buildUsageSearch({
              cwd: skillCwdParam,
              gitBranch: skillGitBranchParam,
              provider: option.id,
              scope: skillScopeParam,
            })}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
};
