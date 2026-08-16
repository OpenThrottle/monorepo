import * as React from 'react';
import clsx from 'clsx';
import { GlobalToolbarSearch } from '@openthrottle/react-router-ui-global';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { useSearchParams } from 'react-router';
import {
  REPOSITORIES_DEFAULT_SORT_BY,
  REPOSITORIES_DEFAULT_SORT_ORDER,
  REPOSITORIES_SORT_BY,
  REPOSITORIES_SORT_OPTIONS,
  REPOSITORIES_SORT_ORDER,
  type RepositoriesSortBy,
  type RepositoriesSortOrder,
} from '~/routing/settings/repositories/config/repositories.defaults';
import { REPOSITORIES_TABLE_COPY } from '~/routing/settings/repositories/data/data.copy';

export interface RepositoriesToolbarProps {
  className?: string;
  limit: number;
  page: number;
  search: string;
  sortBy: string;
  sortOrder: string;
}

/**
 * @description Search + sort toolbar for the repositories index, mirroring
 * ProjectsToolbar: search commits through `GlobalToolbarSearch` and resets
 * paging, sort is a sibling control that preserves `limit`. The header actions
 * (onboarding trigger, clone, add folder) stay in the page header.
 */
export const RepositoriesToolbar = (
  props: RepositoriesToolbarProps,
): React.ReactElement => {
  const { className, limit, page, sortBy, sortOrder } = props;

  const resolvedSortBy: RepositoriesSortBy =
    REPOSITORIES_SORT_BY.find((value) => value === sortBy) ??
    REPOSITORIES_DEFAULT_SORT_BY;
  const resolvedSortOrder: RepositoriesSortOrder =
    REPOSITORIES_SORT_ORDER.find((value) => value === sortOrder) ??
    REPOSITORIES_DEFAULT_SORT_ORDER;
  const selectedValue = `${resolvedSortBy}-${resolvedSortOrder}`;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup

  // Handlers
  const handleSortChange = React.useCallback(
    (value: string) => {
      const [nextSortBy, nextSortOrder] = value.split('-');
      const next = new URLSearchParams(searchParams);

      next.set(
        'sortBy',
        REPOSITORIES_SORT_BY.find((candidate) => candidate === nextSortBy) ??
          REPOSITORIES_DEFAULT_SORT_BY,
      );
      next.set(
        'sortOrder',
        REPOSITORIES_SORT_ORDER.find(
          (candidate) => candidate === nextSortOrder,
        ) ?? REPOSITORIES_DEFAULT_SORT_ORDER,
      );
      next.set('limit', String(limit));
      next.set('page', String(page));

      setSearchParams(next, { replace: true });
    },
    [limit, page, searchParams, setSearchParams],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('w-full', className)}
      data-testid="RepositoriesToolbar"
    >
      <div className="flex w-full flex-wrap items-center gap-2">
        <GlobalToolbarSearch
          aria-label={REPOSITORIES_TABLE_COPY.searchLabel}
          placeholder={REPOSITORIES_TABLE_COPY.searchPlaceholder}
          transformCommittedParams={(next) => {
            next.delete('q');
            next.delete('page');
          }}
        />

        <Select onValueChange={handleSortChange} value={selectedValue}>
          <SelectTrigger
            aria-label={REPOSITORIES_TABLE_COPY.sortLabel}
            className="h-9 w-44 shrink-0 px-3"
          >
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {REPOSITORIES_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="min-w-0 flex-1" />
      </div>
    </div>
  );
};
