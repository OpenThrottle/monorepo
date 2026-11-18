import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { Permission } from './permission.entity.ts';
import type {
  PermissionCreateInput,
  PermissionsRepositoryMock,
} from './permissions.types.ts';

/**
 * @description Builds a {@link PermissionsRepositoryMock} that starts as an empty
 * `permissions` table (see `createBaseRepositoryMock`). Provide it in place of
 * `PermissionsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createPermissionsRepositoryMock(): PermissionsRepositoryMock {
  return {
    ...createBaseRepositoryMock<Permission, PermissionCreateInput>(
      'permissions',
    ),
    findAll: vi.fn(async () => {
      return [];
    }),
    findByName: vi.fn(async () => {
      return null;
    }),
  };
}
