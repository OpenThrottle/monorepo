import { useRouteLoaderData } from 'react-router';

import type { Permission } from '~/global/config/permissions';
import { ROOT_ROUTE_ID } from '~/global/config/permissions';
import { hasPermission } from '~/global/utils/utils.permissions';
import type { loader } from '~/root';

const NO_PERMISSIONS: readonly string[] = [];

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
 * Loaders cannot use this hook; they call `requirePermission(request, …)`.
 */
export const usePermissions = (): readonly string[] => {
  // Hooks
  const data = useRouteLoaderData<typeof loader>(ROOT_ROUTE_ID);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return data?.permissions ?? NO_PERMISSIONS;
};

/**
 * @public
 * @description True when the current user holds `permission`. UI gating only —
 * the server still enforces the permission on every request. See
 * {@link usePermissions} for where the data comes from.
 */
export const useHasPermission = (permission: Permission): boolean =>
  hasPermission(usePermissions(), permission);
