import { describe, it, expect } from 'vitest';
import {
  PERMISSIONS,
  ROLES,
  roleHasPermission,
  ROLE_PERMISSIONS,
} from './roles';

describe('roles', () => {
  describe('ROLE_PERMISSIONS', () => {
    it('admin has all permissions', () => {
      const adminPerms = ROLE_PERMISSIONS[ROLES.ADMIN];
      expect(adminPerms).toContain(PERMISSIONS.SETTINGS_READ);
      expect(adminPerms).toContain(PERMISSIONS.SETTINGS_WRITE);
      expect(adminPerms).toContain(PERMISSIONS.USERS_READ);
      expect(adminPerms).toContain(PERMISSIONS.USERS_WRITE);
    });

    it('user can read and edit workspace settings', () => {
      const userPerms = ROLE_PERMISSIONS[ROLES.USER];
      expect(userPerms).toContain(PERMISSIONS.SETTINGS_READ);
      expect(userPerms).toContain(PERMISSIONS.SETTINGS_WRITE);
      expect(userPerms).toContain(PERMISSIONS.USERS_READ);
      expect(userPerms).not.toContain(PERMISSIONS.USERS_WRITE);
    });

    it('viewer has same read permissions as user', () => {
      const viewerPerms = ROLE_PERMISSIONS[ROLES.VIEWER];
      expect(viewerPerms).toContain(PERMISSIONS.SETTINGS_READ);
      expect(viewerPerms).toContain(PERMISSIONS.USERS_READ);
      expect(viewerPerms).not.toContain(PERMISSIONS.USERS_WRITE);
    });

    it('admin has both flags permissions; user and viewer are read-only', () => {
      expect(ROLE_PERMISSIONS[ROLES.ADMIN]).toContain(PERMISSIONS.FLAGS_READ);
      expect(ROLE_PERMISSIONS[ROLES.ADMIN]).toContain(PERMISSIONS.FLAGS_WRITE);
      expect(ROLE_PERMISSIONS[ROLES.USER]).toContain(PERMISSIONS.FLAGS_READ);
      expect(ROLE_PERMISSIONS[ROLES.USER]).not.toContain(
        PERMISSIONS.FLAGS_WRITE,
      );
      expect(ROLE_PERMISSIONS[ROLES.VIEWER]).toContain(PERMISSIONS.FLAGS_READ);
      expect(ROLE_PERMISSIONS[ROLES.VIEWER]).not.toContain(
        PERMISSIONS.FLAGS_WRITE,
      );
    });

    it('mcp and workflow-ralph have plans read/write only', () => {
      for (const role of [ROLES.MCP, ROLES.WORKFLOW_RALPH] as const) {
        const perms = ROLE_PERMISSIONS[role];
        expect(perms).toEqual([
          PERMISSIONS.PLANS_READ,
          PERMISSIONS.PLANS_WRITE,
        ]);
        expect(perms).not.toContain(PERMISSIONS.USERS_WRITE);
      }
    });
  });

  describe('roleHasPermission', () => {
    it('returns true when role has permission', () => {
      expect(roleHasPermission(ROLES.ADMIN, PERMISSIONS.USERS_WRITE)).toBe(
        true,
      );
      expect(roleHasPermission(ROLES.USER, PERMISSIONS.USERS_READ)).toBe(true);
      expect(roleHasPermission(ROLES.VIEWER, PERMISSIONS.SETTINGS_READ)).toBe(
        true,
      );
      expect(roleHasPermission(ROLES.ADMIN, PERMISSIONS.FLAGS_WRITE)).toBe(
        true,
      );
      expect(roleHasPermission(ROLES.VIEWER, PERMISSIONS.FLAGS_READ)).toBe(
        true,
      );
    });

    it('returns false when role does not have permission', () => {
      expect(roleHasPermission(ROLES.USER, PERMISSIONS.USERS_WRITE)).toBe(
        false,
      );
      expect(roleHasPermission(ROLES.USER, PERMISSIONS.SETTINGS_WRITE)).toBe(
        true,
      );
      expect(roleHasPermission(ROLES.VIEWER, PERMISSIONS.SETTINGS_WRITE)).toBe(
        false,
      );
      expect(roleHasPermission(ROLES.VIEWER, PERMISSIONS.FLAGS_WRITE)).toBe(
        false,
      );
      expect(roleHasPermission(ROLES.MCP, PERMISSIONS.FLAGS_READ)).toBe(false);
    });

    it('uses custom mapping when provided', () => {
      const customMapping = {
        [ROLES.ADMIN]: [PERMISSIONS.USERS_READ] as const,
        [ROLES.MCP]: [] as const,
        [ROLES.USER]: [PERMISSIONS.USERS_READ] as const,
        [ROLES.VIEWER]: [] as const,
        [ROLES.WORKFLOW_RALPH]: [] as const,
      };
      expect(
        roleHasPermission(ROLES.ADMIN, PERMISSIONS.USERS_WRITE, customMapping),
      ).toBe(false);
      expect(
        roleHasPermission(ROLES.VIEWER, PERMISSIONS.USERS_READ, customMapping),
      ).toBe(false);
    });
  });
});
