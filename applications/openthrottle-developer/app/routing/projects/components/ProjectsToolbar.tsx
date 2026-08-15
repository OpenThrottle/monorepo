import * as React from 'react';
import clsx from 'clsx';
import { GlobalToolbarSearch } from '@openthrottle/react-router-ui-global';
import { useSearchParams } from 'react-router';
import { ProjectsSortDropdown } from '~/routing/projects/components/ProjectsSortDropdown';
import {
  PROJECTS_SORT_BY,
  PROJECTS_SORT_ORDER,
  type ProjectsSortBy,
  type ProjectsSortOrder,
} from '~/routing/prompts/config/types';

type ViewMode = 'table' | 'card';

export interface ProjectsToolbarProps {
  className?: string;
  limit: number;
  page: number;
  search: string;
  sortBy: string;
  sortOrder: string;
  view: ViewMode;
}

/**
 * @description Single-row compact toolbar: GlobalToolbarSearch-driven search (search param, resets page), sort. Sort is a sibling control outside the search form.
 */
export const ProjectsToolbar = (
  props: ProjectsToolbarProps,
): React.ReactElement => {
  const { className, limit, page, sortBy, sortOrder } = props;

  const resolvedSortBy: ProjectsSortBy =
    PROJECTS_SORT_BY.find((v) => v === sortBy) ?? 'createdAt';
  const resolvedSortOrder: ProjectsSortOrder =
    PROJECTS_SORT_ORDER.find((v) => v === sortOrder) ?? 'desc';

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup

  // Handlers
  const applyParams = React.useCallback(
    (updates: {
      sortBy?: ProjectsSortBy;
      sortOrder?: ProjectsSortOrder;
      view?: ViewMode;
    }) => {
      const next = new URLSearchParams(searchParams);
      if (updates.sortBy !== undefined) next.set('sortBy', updates.sortBy);
      if (updates.sortOrder !== undefined) {
        next.set('sortOrder', updates.sortOrder);
      }
      if (updates.view !== undefined) next.set('view', updates.view);

      next.set('page', String(page));
      next.set('limit', String(limit));

      setSearchParams(next, { replace: true });
    },
    [limit, page, searchParams, setSearchParams],
  );

  const handleSortChange = React.useCallback(
    (newSortBy: ProjectsSortBy, newSortOrder: ProjectsSortOrder) => {
      applyParams({ sortBy: newSortBy, sortOrder: newSortOrder });
    },
    [applyParams],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('w-full', className)} data-testid="ProjectsToolbar">
      <div className="flex w-full flex-wrap items-center gap-2">
        <GlobalToolbarSearch
          aria-label="Search projects"
          placeholder="Search projects..."
          transformCommittedParams={(next) => {
            next.delete('q');
            next.delete('page');
          }}
        />

        <ProjectsSortDropdown
          onChange={handleSortChange}
          sortBy={resolvedSortBy}
          sortOrder={resolvedSortOrder}
        />

        <div className="min-w-0 flex-1" />
      </div>
    </div>
  );
};
