import * as React from 'react';
import { useLocation } from 'react-router';

import { useIsDocumentHidden } from '../hooks/useIsDocumentHidden';

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
 *
 * A route change that commits while the document is hidden (a redirect, or a
 * navigation that finishes after the user switched tabs) also gets `none`.
 * The browser would skip that transition anyway. react-dom 19.3.1 reports
 * Chromium's "Transition was aborted because of invalid state. Document
 * hidden" skip as an error, and the skip also leaves an unhandled rejection.
 * The message fix is react/react#38034. Drop this guard once a stable react-dom
 * release includes that fix and the `transition.finished.finally()` rejection
 * is gone too.
 */
export const GlobalRouteViewTransition = (
  props: GlobalRouteViewTransitionProps,
): React.ReactElement => {
  const { children } = props;

  // Hooks
  const { pathname } = useLocation();
  const refCommittedPathname = React.useRef(pathname);
  const isDocumentHidden = useIsDocumentHidden();

  // Setup
  const isRouteChange = pathname !== refCommittedPathname.current;
  const shouldAnimate = isRouteChange && !isDocumentHidden;
  const transitionClass = shouldAnimate ? 'auto' : 'none';

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
