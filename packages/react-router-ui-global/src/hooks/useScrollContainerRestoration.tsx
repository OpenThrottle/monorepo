import * as React from 'react';
import { useLocation, useNavigationType } from 'react-router';

/**
 * @description Saves scrollTop per history entry on leave and restores it on
 * browser back/forward; resets to top only when the pathname changes. A
 * search- or hash-only navigation on the same route (URL-synced tabs, filters,
 * pagination) preserves the reader's scroll position — `setSearchParams` pushes
 * a new history entry, and resetting on every push would jerk the page to the
 * top on each tab click.
 */
export const useScrollContainerRestoration = (
  containerRef: React.RefObject<HTMLDivElement | null>,
): void => {
  const scrollPositionsRef = React.useRef(new Map<string, number>());
  const previousPathnameRef = React.useRef<string | null>(null);
  const { key: locationKey, pathname } = useLocation();
  const navigationType = useNavigationType();

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (navigationType === 'POP') {
      const savedScrollTop = scrollPositionsRef.current.get(locationKey);
      if (savedScrollTop !== undefined) {
        container.scrollTop = savedScrollTop;
      }
    } else if (previousPathnameRef.current !== pathname) {
      // Push/replace that lands on a different route — treat it as a fresh page
      // and start at the top. Same-pathname pushes (search/hash-only changes)
      // fall through and keep the current scroll position.
      container.scrollTop = 0;
    }

    previousPathnameRef.current = pathname;

    return () => {
      scrollPositionsRef.current.set(locationKey, container.scrollTop);
    };
  }, [containerRef, locationKey, navigationType, pathname]);
};
