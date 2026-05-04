import * as React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import type { RouteObject } from 'react-router';
import {
  createMemoryRouter,
  createRoutesStub,
  RouterProvider,
} from 'react-router';

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
