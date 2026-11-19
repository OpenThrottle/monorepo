import * as React from 'react';
import type { NavigateOptions } from 'react-router';

import { ROUTE_STATS_URL } from '../data/data.route-stats';
import { useUrlSyncedOverlay } from './useUrlSyncedOverlay';

export interface UseRouteStatsToggleResult {
  /** DOM id for the panel; the toggle button points `aria-controls` at it. */
  readonly contentId: string;
  readonly isOpen: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly toggle: () => void;
}

/**
 * @public
 * @description Open state of a route's collapsible stats row, read from and
 * written to the `?stats=open` search param (absent = closed). The URL is the
 * only source of truth, so any component under the router can read or flip it.
 *
 * Toggling **replaces** the current history entry rather than pushing one, so
 * opening and closing the stats never piles up back-button entries; reload and
 * shared links still honour the state. Scroll position is preserved, every other
 * search param is kept. A search-only update never starts the root view
 * transition (see `GlobalRouteViewTransition`), so the panel's own height
 * animation runs alone. Pair the route with `shouldRevalidateIgnoringParams` so
 * a toggle does not re-run its loader.
 */
export const useRouteStatsToggle = (): UseRouteStatsToggleResult => {
  // Hooks
  const setSearchParamsOptions = React.useMemo((): NavigateOptions => {
    return { replace: true };
  }, []);

  const { open, setOpen: setOverlayOpen } = useUrlSyncedOverlay({
    openValue: ROUTE_STATS_URL.openValue,
    param: ROUTE_STATS_URL.param,
    setSearchParamsOptions,
  });

  // Setup

  // Handlers
  const setOpen = React.useCallback(
    (nextOpen: boolean): void => {
      if (nextOpen === open) {
        return;
      }
      setOverlayOpen(nextOpen);
    },
    [open, setOverlayOpen],
  );

  const toggle = React.useCallback((): void => {
    setOverlayOpen(!open);
  }, [open, setOverlayOpen]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return {
    contentId: ROUTE_STATS_URL.contentId,
    isOpen: open,
    setOpen,
    toggle,
  };
};
