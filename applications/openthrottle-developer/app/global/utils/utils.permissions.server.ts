import { getAuthTokenFromCookie } from '@openthrottle/react-router-auth';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

import { GetMyPermissionsDocument } from '~/__generated__/graphql';
import type { Permission } from '~/global/config/permissions';
import { hasPermission } from '~/global/utils/utils.permissions';

/**
 * @description Fetches the current user's permission names (`myPermissions`).
 * Never throws: a logged-out visitor, a failed request, or a user without
 * `users:read` all resolve to an empty list, so callers fail closed (nothing
 * gated is shown) without breaking the page.
 */
export const fetchMyPermissions = async (
  request: Request,
): Promise<readonly string[]> => {
  if (getAuthTokenFromCookie(request.headers.get('cookie') ?? '') === null) {
    return [];
  }

  try {
    const { myPermissions } = await executeGraphqlWithAuth(
      request,
      GetMyPermissionsDocument,
    );

    return myPermissions;
  } catch (error) {
    console.error('permissions: GetMyPermissions failed', error);

    return [];
  }
};

/**
 * @public
 * @description Route-loader gate. Pass the loader's `request`; throws a 404
 * `Response` (not 403, so the route's existence is not disclosed) unless the
 * current user holds `permission`.
 *
 * Fetches `myPermissions` itself because a child loader cannot read the root
 * loader's data on the server. This is the authoritative check for loaders; the
 * client-side `useHasPermission` only decides what to render, and the server
 * resolvers still enforce their own `Permissions` guards.
 *
 * @example
 * export const loader = async ({ request }: Route.LoaderArgs) => {
 *   await requirePermission(request, PERMISSIONS.BLOG_DRAFT);
 *   // ...
 * };
 */
export const requirePermission = async (
  request: Request,
  permission: Permission,
): Promise<void> => {
  const permissions = await fetchMyPermissions(request);

  if (!hasPermission(permissions, permission)) {
    throw new Response('Not Found', { status: 404 });
  }
};
