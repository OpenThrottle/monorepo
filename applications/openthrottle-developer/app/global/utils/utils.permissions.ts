import type { GlobalSidebarContentLinkProps } from '@openthrottle/react-router-ui-global';

import type { Permission } from '~/global/config/permissions';

/**
 * @description Navigation link that may declare the permission a viewer needs
 * to see it. Links without `requiredPermission` are always shown.
 */
export interface PermissionGatedNavigationLink extends GlobalSidebarContentLinkProps {
  readonly requiredPermission?: Permission;
}

/** Navigation record whose links may be permission-gated. */
export type PermissionGatedNavigation = Record<
  string,
  readonly PermissionGatedNavigationLink[]
>;

/**
 * @description True when `permissions` (the current user's permission names)
 * contains `permission`. Pure counterpart of the `useHasPermission` hook.
 */
export const hasPermission = (
  permissions: readonly string[],
  permission: Permission,
): boolean => permissions.includes(permission);

/**
 * @description Drops links whose `requiredPermission` the viewer lacks, and
 * sections left empty by that filtering. Declarative: adding a gated link only
 * needs a `requiredPermission` in `data.navigation.ts`, no special-casing here.
 * Feeds both the sidebar and the ⌘K palette, so a hidden link is hidden in both.
 */
export const filterNavigationByPermission = (
  navigation: PermissionGatedNavigation,
  permissions: readonly string[],
): Record<string, PermissionGatedNavigationLink[]> =>
  Object.entries(navigation).reduce<
    Record<string, PermissionGatedNavigationLink[]>
  >((visible, [section, links]) => {
    const allowed = links.filter(
      (link) =>
        link.requiredPermission === undefined ||
        hasPermission(permissions, link.requiredPermission),
    );

    return allowed.length === 0 ? visible : { ...visible, [section]: allowed };
  }, {});
