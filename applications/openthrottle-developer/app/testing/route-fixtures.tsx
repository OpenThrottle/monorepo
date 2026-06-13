/**
 * @description Route-level test harness for openthrottle-developer: mount components under {@link createRoutesStub} or a {@link createMemoryRouter} tree without running the full app. Use this for isolated debugging of Link hrefs, navigators, and route-aware UI. This app does not ship Storybook; Vitest + these helpers are the lightweight visual/snapshot harness for routing modules.
 *
 * All render helpers here wrap the tree in the shared app providers (currently {@link TooltipProvider}) so components that render shadcn primitives requiring provider context (Tooltip, etc.) work in isolation — mirroring what GlobalProviders supplies in the running app.
 * @see `applications/openthrottle-developer/docs/routing-modules-debug-harness.md` for prioritized routing modules and adoption notes.
 */

import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import type { RouteObject } from 'react-router';
import {
  createMemoryRouter,
  createRoutesStub,
  RouterProvider,
} from 'react-router';

/** Wrap a tree in the shared app providers used across component tests. */
const withProviders = (node: React.ReactElement): React.ReactElement => (
  <TooltipProvider>{node}</TooltipProvider>
);

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
  return render(withProviders(<RouterProvider router={router} />));
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
  return render(withProviders(<Stub />));
};

/**
 * @description Alias of {@link renderRoutesStub} with an explicit name for component tests that render shadcn primitives needing provider context. Prefer this over a bare `render()` for such components.
 */
export const renderWithProviders = renderRoutesStub;

/**
 * @description Renders a {@link createRoutesStub} tree from a full route definition array — use when one component at `/` is not enough (e.g. route-level ErrorBoundary, nested routes).
 */
export const renderRouteHarness = (
  routes: Parameters<typeof createRoutesStub>[0],
): RenderResult => {
  const Stub = createRoutesStub(routes);
  return render(withProviders(<Stub />));
};
