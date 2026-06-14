import * as React from 'react';
import { useLocation, useNavigationType } from 'react-router';

/**
 * @description Saves scrollTop per history entry on leave and restores it on browser back/forward; resets to top on push/replace.
 */
export const useScrollContainerRestoration = (
  containerRef: React.RefObject<HTMLDivElement | null>,
): void => {
  const scrollPositionsRef = React.useRef(new Map<string, number>());
  const { key: locationKey } = useLocation();
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
    } else {
      container.scrollTop = 0;
    }

    return () => {
      scrollPositionsRef.current.set(locationKey, container.scrollTop);
    };
  }, [containerRef, locationKey, navigationType]);
};
