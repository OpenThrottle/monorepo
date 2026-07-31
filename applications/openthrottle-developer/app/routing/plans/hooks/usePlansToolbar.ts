/**
 * @description URL-driven filter/search state for {@link PlansToolbar}: the
 * controlled search input (kept in sync with `q` / `semantic`), and the
 * assignee / status / sort / search-submit handlers that rewrite the search
 * params (always resetting `page` and preserving `limit`). Extracted from the
 * component per component-primitive-shape R7.
 */
import * as React from 'react';
import { useSearchParams } from 'react-router';
import type { PlansSortBy, PlansSortOrder } from '~/routing/plans/config/types';

export interface UsePlansToolbarOptions {
  readonly limit: number;
  readonly page: number;
}

export interface UsePlansToolbarResult {
  readonly handleAssigneeChange: (newAssignees: string[]) => void;
  readonly handleSearchSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  readonly handleSortChange: (
    newSortBy: PlansSortBy,
    newSortOrder: PlansSortOrder,
  ) => void;
  readonly handleStatusChange: (newStatuses: string[]) => void;
  readonly searchInput: string;
  readonly setSearchInput: (value: string) => void;
}

export const usePlansToolbar = (
  options: UsePlansToolbarOptions,
): UsePlansToolbarResult => {
  const { limit, page } = options;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = React.useState(
    () => searchParams.get('q') ?? '',
  );
  const [semanticChecked, setSemanticChecked] = React.useState(
    () =>
      searchParams.get('semantic') === '1' ||
      searchParams.get('semantic') === 'true',
  );

  // Setup
  const searchQuery = searchParams.get('q') ?? '';
  const searchModeSemantic =
    searchParams.get('semantic') === '1' ||
    searchParams.get('semantic') === 'true';

  // Handlers
  const handleAssigneeChange = React.useCallback(
    (newAssignees: string[]) => {
      const next = new URLSearchParams(searchParams);
      next.delete('assignee');
      for (const a of newAssignees) {
        next.append('assignee', a);
      }
      next.set('page', '1');
      next.set('limit', String(limit));
      setSearchParams(next, { replace: true });
    },
    [limit, searchParams, setSearchParams],
  );

  const handleStatusChange = React.useCallback(
    (newStatuses: string[]) => {
      const next = new URLSearchParams(searchParams);
      next.delete('status');
      for (const s of newStatuses) {
        next.append('status', s);
      }
      next.set('page', '1');
      next.set('limit', String(limit));
      setSearchParams(next, { replace: true });
    },
    [limit, searchParams, setSearchParams],
  );

  const applyParams = React.useCallback(
    (updates: { sortBy?: PlansSortBy; sortOrder?: PlansSortOrder }) => {
      const next = new URLSearchParams(searchParams);
      if (updates.sortBy !== undefined) next.set('sortBy', updates.sortBy);
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
    (newSortBy: PlansSortBy, newSortOrder: PlansSortOrder) => {
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
        if (semanticChecked) {
          next.set('semantic', '1');
        } else {
          next.delete('semantic');
        }
      } else {
        next.delete('q');
        next.delete('semantic');
      }

      next.set('page', '1');
      next.set('limit', String(limit));

      setSearchParams(next, { replace: true });
    },

    [limit, searchParams, searchInput, semanticChecked, setSearchParams],
  );

  // Markup

  // Life Cycle
  React.useEffect(() => {
    setSearchInput(searchQuery);
    setSemanticChecked(searchModeSemantic);
  }, [searchQuery, searchModeSemantic]);

  // 🔌 Short Circuit
  return {
    handleAssigneeChange,
    handleSearchSubmit,
    handleSortChange,
    handleStatusChange,
    searchInput,
    setSearchInput,
  };
};
