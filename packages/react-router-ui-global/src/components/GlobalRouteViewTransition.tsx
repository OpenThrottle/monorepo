import * as React from 'react';
import { useLocation } from 'react-router';

export interface GlobalRouteViewTransitionProps {
  readonly children: React.ReactNode;
}

/**
 * @public
 * @description Wraps an app's root `<Outlet>` in React's `<ViewTransition>` so
 * route changes cross-fade, replacing React Router's deprecated per-link
 * `viewTransition` prop.
 *
 * A bare boundary animates every commit that runs inside a transition, and
 * React Router runs nearly all of them that way: the navigation's loading
 * state, search-param updates (filters, the stats toggle, URL-synced
 * overlays), background revalidations and Suspense reveals. Only a pathname
 * change animates here. Every other commit gets the `none` class, so React
 * never calls `document.startViewTransition` for it. Reduced motion is
 * handled in CSS (`theme.css`).
 */
export const GlobalRouteViewTransition = (
  props: GlobalRouteViewTransitionProps,
): React.ReactElement => {
  const { children } = props;

  // Hooks
  const { pathname } = useLocation();
  const refCommittedPathname = React.useRef(pathname);

  // Setup
  const isRouteChange = pathname !== refCommittedPathname.current;
  const transitionClass = isRouteChange ? 'auto' : 'none';

  // Handlers

  // Markup

  // Life Cycle
  React.useLayoutEffect(() => {
    refCommittedPathname.current = pathname;
  }, [pathname]);

  // 🔌 Short Circuit

  return (
    <React.ViewTransition default={transitionClass}>
      {children}
    </React.ViewTransition>
  );
};
