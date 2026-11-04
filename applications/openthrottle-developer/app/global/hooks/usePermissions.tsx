import { useRouteLoaderData } from 'react-router';

import { ROOT_ROUTE_ID } from '~/global/config/permissions';
import type { loader } from '~/root';

/**
 * @description The current user's permission names, read from the root loader.
 *
 * Where `myPermissions` is loaded: ONCE, in the root loader (`app/root.tsx`),
 * fetched in parallel with the `me` and health probes and returned as
 * `permissions`. Every component reads that single copy through
 * `useRouteLoaderData('root')` — nothing refetches per component. The root
 * loader does not revalidate (`shouldRevalidate` is false); login/logout are
 * full navigations that re-run it. Logged-out visitors, failed fetches and
 * users without `users:read` all yield an empty list.
 *
 * The root loader always returns an array (it soft-fails to `[]`), so the
 * empty fallback below only applies when root loader data is absent — its
 * per-render identity never reaches a dependency list in practice.
 *
 * Loaders cannot use this hook; they call `requirePermission(request, …)`.
 */
export const usePermissions = (): readonly string[] => {
  // Hooks
  const data = useRouteLoaderData<typeof loader>(ROOT_ROUTE_ID);

  // Setup
  const noPermissions: readonly string[] = [];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return data?.permissions ?? noPermissions;
};
