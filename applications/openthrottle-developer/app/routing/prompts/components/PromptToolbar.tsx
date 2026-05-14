import * as React from 'react';
import classnames from 'classnames';
import { useDebouncedSearchParam } from '@openthrottle/react-router-ui';
import { Button, Input } from '@openthrottle/react-router-shadcn';
import { Link, useSearchParams } from 'react-router';
import { PlusIcon } from 'lucide-react';
import { TypeMultiSelect } from './TypeMultiSelect';
import { PromptSortDropdown } from './PromptSortDropdown';
import {
  PromptsSortBy,
  PromptsSortOrder,
} from '~/routing/prompts/config/types';

export interface PromptToolbarProps {
  readonly className?: string;
  readonly limit: number;
  readonly page: number;
  readonly sortBy: PromptsSortBy;
  readonly sortOrder: PromptsSortOrder;
  readonly types: readonly string[];
}

/**
 * @description Toolbar for prompts list: URL-driven search (q), type filter dropdown, sort dropdown, and Create button. Preserves role=search, data-testid, and URL-driven state.
 */
export const PromptToolbar = (props: PromptToolbarProps) => {
  const { className, limit, page, sortBy, sortOrder, types } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    committedValue: searchQuery,
    commitNow,
    onSearchInputChange,
    searchInputValue: searchInput,
  } = useDebouncedSearchParam({
    transformCommittedParams: (next) => {
      next.set('limit', String(limit));
      next.set('page', '1');
    },
  });

  // Setup
  const hasActiveFilters =
    searchQuery.length > 0 ||
    types.length > 0 ||
    sortBy !== 'updatedAt' ||
    sortOrder !== 'desc';

  // Handlers
  const handleTypeChange = React.useCallback(
    (newTypes: string[]) => {
      const next = new URLSearchParams(searchParams);
      next.delete('type');
      for (const t of newTypes) {
        next.append('type', t);
      }
      next.set('page', '1');
      next.set('limit', String(limit));
      setSearchParams(next, { replace: true });
    },
    [limit, searchParams, setSearchParams],
  );

  const applyParams = React.useCallback(
    (updates: { sortBy?: PromptsSortBy; sortOrder?: PromptsSortOrder }) => {
      const next = new URLSearchParams(searchParams);

      if (updates.sortBy !== undefined) {
        next.set('sortBy', updates.sortBy);
      }

      if (updates.sortOrder !== undefined) {
        next.set('sortOrder', updates.sortOrder);
      }

      next.set('page', String(page));
      next.set('limit', String(limit));

      setSearchParams(next, { replace: true });
    },

    [limit, page, searchParams, setSearchParams],
  );

  const handleSortChange = React.useCallback(
    (newSortBy: PromptsSortBy, newSortOrder: PromptsSortOrder) => {
      applyParams({ sortBy: newSortBy, sortOrder: newSortOrder });
    },
    [applyParams],
  );

  const handleSearchSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      commitNow();
    },

    [commitNow],
  );

  const handleClearFilters = React.useCallback(() => {
    const next = new URLSearchParams();

    next.set('limit', String(limit));
    next.set('page', '1');

    setSearchParams(next, { replace: true });
  }, [limit, setSearchParams]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('w-full', className)}
      data-testid="PromptToolbar"
    >
      <form
        className="flex flex-wrap items-center gap-2 w-full"
        onSubmit={handleSearchSubmit}
        role="search"
      >
        <Input
          aria-label="Search prompts"
          className="min-w-[100px] w-[180px] shrink-0 rounded-md border border-input bg-background px-2.5 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="PromptToolbar-search-input"
          name="q"
          onChange={onSearchInputChange}
          placeholder="Search by title…"
          type="search"
          value={searchInput}
        />
        <Button
          data-testid="PromptToolbar-search-button"
          type="submit"
          variant="outline"
        >
          Search
        </Button>
        <TypeMultiSelect
          compact={true}
          data-testid="PromptToolbar-type-filter"
          onChange={handleTypeChange}
          value={types}
        />
        <PromptSortDropdown
          onChange={handleSortChange}
          sortBy={sortBy}
          sortOrder={sortOrder}
        />
        {hasActiveFilters ? (
          <Button
            data-testid="PromptToolbar-clear-filters"
            onClick={handleClearFilters}
            type="button"
            variant="ghost"
          >
            Clear filters
          </Button>
        ) : null}
        <div className="flex-1 min-w-0" />
        <Button
          asChild={true}
          className="shrink-0"
          data-testid="PromptToolbar-create-button"
          variant="outline"
        >
          <Link to="/prompts/create">
            <PlusIcon className="w-4 h-4" /> Create prompt
          </Link>
        </Button>
      </form>
    </div>
  );
};
