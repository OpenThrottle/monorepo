import * as React from 'react';
import { useSearchParams } from 'react-router';
import classnames from 'classnames';
import {
  DEFAULT_SEARCH_LIMIT,
  SEARCH_LIMIT_OPTIONS,
} from '~/routing/search/config';
import { parseSearchParams } from '~/routing/search/utils/parsers';

export interface SearchFiltersProps {
  readonly className?: string;
}

/**
 * @description Filter controls for search. Limit (results per page) is wired to URL params.
 * Future: source filter when API supports filtering by chunk source.
 */
export const SearchFilters = (props: SearchFiltersProps) => {
  const { className } = props;
  const [searchParams, setSearchParams] = useSearchParams();
  const { limit } = parseSearchParams(searchParams);

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value;
    const newLimit = parseInt(value, 10);
    if (Number.isNaN(newLimit)) return;
    const next = new URLSearchParams(searchParams);
    next.set('limit', String(newLimit));
    next.set('page', '1');
    setSearchParams(next, { replace: true });
  };

  return (
    <div
      className={classnames('flex flex-wrap items-center gap-4 p-4', className)}
      data-testid="SearchFilters"
    >
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Results per page</span>
        <select
          aria-label="Results per page"
          className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          onChange={handleLimitChange}
          value={
            SEARCH_LIMIT_OPTIONS.includes(
              limit as (typeof SEARCH_LIMIT_OPTIONS)[number],
            )
              ? limit
              : DEFAULT_SEARCH_LIMIT
          }
        >
          {SEARCH_LIMIT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
      {/* SearchFilters: future source/limit filters when API supports source */}
    </div>
  );
};
