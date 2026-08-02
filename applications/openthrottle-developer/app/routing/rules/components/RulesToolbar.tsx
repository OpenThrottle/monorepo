import * as React from 'react';
import clsx from 'clsx';
import { useDebouncedSearchParam } from '@openthrottle/react-router-ui';
import {
  Button,
  Input,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import { Link, useSearchParams } from 'react-router';
import { PlusIcon } from 'lucide-react';
import { RULES_COPY } from '../data/data.copy';
import {
  isRulesEnabledFilter,
  parseRulesEnabledFilterFromSearchParams,
  type RulesEnabledFilter,
} from '../utils/parsers';

export interface RulesToolbarProps {
  className?: string;
}

/**
 * @description Toolbar for rules list: URL-driven search (`q`), enabled filter
 * (`all|enabled|disabled`), and New rule CTA. Preserves `role=search` and
 * URL-driven state for client-side filtering on the index route.
 */
export const RulesToolbar = (props: RulesToolbarProps): React.ReactElement => {
  const { className } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    committedValue: searchQuery,
    commitNow,
    onSearchInputChange,
    searchInputValue: searchInput,
  } = useDebouncedSearchParam();

  // Setup
  const enabledFilter = parseRulesEnabledFilterFromSearchParams(searchParams);
  const hasActiveFilters = searchQuery.length > 0 || enabledFilter !== 'all';

  // Handlers
  const handleSearchSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      commitNow();
    },
    [commitNow],
  );

  const handleEnabledFilterChange = React.useCallback(
    (value: string): void => {
      // Radix single toggle emits '' when the active item is clicked again;
      // keep the current selection instead of clearing the filter.
      if (!isRulesEnabledFilter(value)) {
        return;
      }

      const next = new URLSearchParams(searchParams);
      const filter: RulesEnabledFilter = value;

      if (filter === 'all') {
        next.delete('enabled');
      } else {
        next.set('enabled', filter);
      }

      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleClearFilters = React.useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('enabled');
    next.delete('q');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('w-full', className)} data-testid="RulesToolbar">
      <form
        className="flex w-full flex-wrap items-center gap-2"
        onSubmit={handleSearchSubmit}
        role="search"
      >
        <Input
          aria-label={RULES_COPY.searchAriaLabel}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-[220px] min-w-[100px] shrink-0 rounded-md border px-2.5 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none"
          data-testid="RulesToolbar-search-input"
          name="q"
          onChange={onSearchInputChange}
          placeholder={RULES_COPY.searchPlaceholder}
          type="search"
          value={searchInput}
        />
        <Button
          data-testid="RulesToolbar-search-button"
          type="submit"
          variant="outline"
        >
          {RULES_COPY.searchAction}
        </Button>

        <ToggleGroup
          aria-label={RULES_COPY.filterGroupLabel}
          data-testid="RulesToolbar-enabled-filter"
          onValueChange={handleEnabledFilterChange}
          type="single"
          value={enabledFilter}
          variant="outline"
        >
          <ToggleGroupItem value="all">
            {RULES_COPY.filterAllLabel}
          </ToggleGroupItem>
          <ToggleGroupItem value="enabled">
            {RULES_COPY.filterEnabledLabel}
          </ToggleGroupItem>
          <ToggleGroupItem value="disabled">
            {RULES_COPY.filterDisabledLabel}
          </ToggleGroupItem>
        </ToggleGroup>

        {hasActiveFilters ? (
          <Button
            data-testid="RulesToolbar-clear-filters"
            onClick={handleClearFilters}
            type="button"
            variant="ghost"
          >
            {RULES_COPY.clearFiltersAction}
          </Button>
        ) : null}

        <div className="min-w-0 flex-1" />

        <Button
          asChild={true}
          className="shrink-0"
          data-testid="RulesToolbar-create-button"
          variant="outline"
        >
          <Link to="/rules/new" viewTransition={true}>
            <PlusIcon className="size-4" />
            {RULES_COPY.newRuleAction}
          </Link>
        </Button>
      </form>
    </div>
  );
};
