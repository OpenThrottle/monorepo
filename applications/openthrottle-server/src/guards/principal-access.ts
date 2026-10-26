/**
 * @description Principal lookups shared by {@link GqlPermissionsGuard} and resolvers that need
 * the caller's permissions or identity themselves (e.g. a status-dependent permission rule that
 * the static `@Permissions()` metadata cannot express). Plain functions over injected services,
 * not an injectable class: the guard is instantiated in every feature module that uses it, so a
 * new constructor dependency on it would have to be provided in all of them.
 */

import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT } from '@openthrottle/nestjs-auth';
import type {
  RolesService,
  ServiceAccountsService,
  UsersService,
} from '@openthrottle/nestjs-repositories';

/** Services {@link getEditorNameForPrincipal} reads the caller's display name from. */
export interface PrincipalIdentityServices {
  readonly serviceAccountsService: ServiceAccountsService;
  readonly usersService: UsersService;
}

const nonBlank = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * @description The permissions held by a principal: a service account's via its roles, a
 * user's via theirs. The single lookup behind both the permission guard and in-resolver checks.
 */
export const getPermissionsForPrincipal = async (
  rolesService: RolesService,
  principal: AuthPrincipal,
): Promise<readonly string[]> =>
  principal.kind === AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT
    ? rolesService.getPermissionsForServiceAccount(principal.sub)
    : rolesService.getPermissionsForUser(principal.sub);

/**
 * @description A human-readable name for who made an edit, stored as `last_edited_by`. A
 * service account is its `name`; a user is their GitHub username, falling back to their email
 * (from the row, then the token) and finally their id, so the result is never empty.
 */
export const getEditorNameForPrincipal = async (
  { serviceAccountsService, usersService }: PrincipalIdentityServices,
  principal: AuthPrincipal,
): Promise<string> => {
  if (principal.kind === AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT) {
    const serviceAccount = await serviceAccountsService.findById(principal.sub);
    return nonBlank(serviceAccount?.name) ?? principal.sub;
  }

  const user = await usersService.findById(principal.sub);
  return (
    nonBlank(user?.githubUsername) ??
    nonBlank(user?.email) ??
    nonBlank(principal.email) ??
    principal.sub
  );
};
