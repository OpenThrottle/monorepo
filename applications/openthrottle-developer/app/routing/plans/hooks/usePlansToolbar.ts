/**
 * @description URL-driven filter/sort state for {@link PlansToolbar}: the
 * assignee / status / sort handlers that rewrite the search params (always
 * resetting `page` and preserving `limit`). Search itself is owned by the
 * shared `GlobalToolbarSearch` control (submit-to-URL on `search`), so this
 * hook no longer manages the search input. Extracted from the component per
 * component-primitive-shape R7.
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
  readonly handleSortChange: (
    newSortBy: PlansSortBy,
    newSortOrder: PlansSortOrder,
  ) => void;
  readonly handleStatusChange: (newStatuses: string[]) => void;
}

export const usePlansToolbar = (
  options: UsePlansToolbarOptions,
): UsePlansToolbarResult => {
  const { limit, page } = options;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup

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

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  return {
    handleAssigneeChange,
    handleSortChange,
    handleStatusChange,
  };
};
