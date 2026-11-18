import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { Role } from './role.entity.ts';
import type { RoleCreateInput, RolesRepositoryMock } from './roles.types.ts';

/**
 * @description Builds a {@link RolesRepositoryMock} that starts as an empty `roles` table
 * (see `createBaseRepositoryMock`): no roles, no assignments, and every boolean write
 * answering `false` like a missing user, role or permission. Provide it in place of
 * `RolesRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createRolesRepositoryMock(): RolesRepositoryMock {
  return {
    ...createBaseRepositoryMock<Role, RoleCreateInput>('roles'),
    addPermissionToRole: vi.fn(async () => {
      return false;
    }),
    assignRoleToServiceAccount: vi.fn(async () => {
      return false;
    }),
    assignRoleToUser: vi.fn(async () => {
      return false;
    }),
    findAll: vi.fn(async () => {
      return [];
    }),
    findByName: vi.fn(async () => {
      return null;
    }),
    findRoleNamesByServiceAccountId: vi.fn(async () => {
      return [];
    }),
    findRoleNamesByUserId: vi.fn(async () => {
      return [];
    }),
    findRolesForServiceAccount: vi.fn(async () => {
      return [];
    }),
    findRolesForUser: vi.fn(async () => {
      return [];
    }),
    getPermissionsForServiceAccount: vi.fn(async () => {
      return [];
    }),
    getPermissionsForUser: vi.fn(async () => {
      return [];
    }),
    getRoleToPermissionsMapping: vi.fn(async () => {
      return {};
    }),
    removePermissionFromRole: vi.fn(async () => {
      return false;
    }),
    removeRoleFromServiceAccount: vi.fn(async () => {
      return false;
    }),
    removeRoleFromUser: vi.fn(async () => {
      return false;
    }),
  };
}
