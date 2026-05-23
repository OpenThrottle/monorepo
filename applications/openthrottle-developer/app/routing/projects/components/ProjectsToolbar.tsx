import * as React from 'react';
import classnames from 'classnames';
import { Button, Input } from '@openthrottle/react-router-shadcn';
import { useSearchParams } from 'react-router';
import { ProjectsSortDropdown } from '~/routing/projects/components/ProjectsSortDropdown';
import {
  ProjectsSortBy,
  ProjectsSortOrder,
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
 * @description Single-row compact toolbar: URL-driven search (q), view toggle, sort, Create project. One form with role=search; preserves page/limit/sort/view on submit.
 */
export const ProjectsToolbar = (
  props: ProjectsToolbarProps,
): React.ReactElement => {
  const { className, limit, page, search, sortBy, sortOrder, view } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = React.useState(() => search);

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

  const handleSearchSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const next = new URLSearchParams(searchParams);
      const q = searchInput.trim();

      if (q) {
        next.set('q', q);
      } else {
        next.delete('q');
      }

      next.set('page', '1');
      next.set('limit', String(limit));
      next.set('sortBy', sortBy);
      next.set('sortOrder', sortOrder);
      next.set('view', view);

      setSearchParams(next, { replace: true });
    },
    [
      limit,
      searchParams,
      searchInput,
      sortBy,
      sortOrder,
      setSearchParams,
      view,
    ],
  );

  // Markup

  // Life Cycle
  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('w-full', className)}
      data-testid="ProjectsToolbar"
    >
      <form
        action="/projects"
        className="flex flex-wrap items-center gap-2 w-full"
        method="get"
        onSubmit={handleSearchSubmit}
        role="search"
      >
        <div className="flex shrink-0 items-center gap-2">
          <Input
            aria-label="Search projects"
            className="min-w-[100px] h-9 w-[140px] shrink-0"
            name="q"
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search projects..."
            type="search"
            value={searchInput}
          />
          <Button size="sm" type="submit" variant="outline">
            Search
          </Button>
        </div>

        <ProjectsSortDropdown
          onChange={handleSortChange}
          sortBy={sortBy as ProjectsSortBy}
          sortOrder={sortOrder as ProjectsSortOrder}
        />

        <div className="flex-1 min-w-0" />
      </form>
    </div>
  );
};
