/**
 * @description Route-level test harness for openthrottle-developer: mount components under {@link createRoutesStub} or a {@link createMemoryRouter} tree without running the full app. Use this for isolated debugging of Link hrefs, navigators, and route-aware UI. This app does not ship Storybook; Vitest + these helpers are the lightweight visual/snapshot harness for routing modules.
 */

import * as React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import type { RouteObject } from 'react-router';
import {
  createMemoryRouter,
  createRoutesStub,
  RouterProvider,
} from 'react-router';

/**
 * @description Re-export for tests that need custom stub routes (multiple paths, route-level ErrorBoundary, loaders). Prefer {@link renderRoutesStub} or {@link renderRouteHarness}.
 */
export const createTestRoutesStub = createRoutesStub;

/**
 * @description Renders a route tree in a memory-backed data router. Prefer when exercising components that expect full router context (links, navigation).
 */
export const renderWithMemoryRouter = (
  routes: RouteObject[],
  options?: { readonly initialEntries?: readonly string[] },
): RenderResult => {
  const router = createMemoryRouter(routes, {
    initialEntries: options?.initialEntries
      ? [...options.initialEntries]
      : ['/'],
  });
  return render(<RouterProvider router={router} />);
};

/**
 * @description Renders a single route module via {@link createRoutesStub} without wiring a route module file — useful for loader-less component props (e.g. `Route.ComponentProps` stubs).
 */
export const renderRoutesStub = (
  element: React.ReactElement,
  options?: { readonly path?: string },
): RenderResult => {
  const path = options?.path ?? '/';
  const Stub = createRoutesStub([
    {
      Component: (): React.ReactElement => element,
      path,
    },
  ]);
  return render(<Stub />);
};

/**
 * @description Renders a {@link createRoutesStub} tree from a full route definition array — use when one component at `/` is not enough (e.g. route-level ErrorBoundary, nested routes).
 */
export const renderRouteHarness = (
  routes: Parameters<typeof createRoutesStub>[0],
): RenderResult => {
  const Stub = createRoutesStub(routes);
  return render(<Stub />);
};
