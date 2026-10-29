import type { Permission } from '~/global/config/permissions';
import { usePermissions } from '~/global/hooks/usePermissions';
import { hasPermission } from '~/global/utils/utils.permissions';

/**
 * @public
 * @description True when the current user holds `permission`. UI gating only —
 * the server still enforces the permission on every request. See
 * {@link usePermissions} for where the data comes from.
 */
export const useHasPermission = (permission: Permission): boolean => {
  // Hooks
  const permissions = usePermissions();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return hasPermission(permissions, permission);
};
