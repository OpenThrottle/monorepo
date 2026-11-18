import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { Permission } from './permission.entity.ts';
import type { PermissionsRepository } from './permissions.repository.ts';

/**
 * Scalar/column fields of Permission (no relations).
 * @public
 */
export type PermissionData = Pick<
  Permission,
  'createdAt' | 'description' | 'id' | 'name'
>;

/**
 * @description What `PermissionsRepository.create` takes: the permission's columns, with the
 * roles relation left out and `description` optional. `name` is required.
 * @public
 */
export interface PermissionCreateInput
  extends
    Omit<CreateModelInput<Permission>, 'description' | 'roles'>,
    Partial<Pick<CreateModelInput<Permission>, 'description'>> {}

/**
 * @description A {@link PermissionsRepository} mock: every inherited `BaseRepository` method
 * plus the permission ones.
 * @public
 */
export interface PermissionsRepositoryMock extends BaseRepositoryMock<
  Permission,
  PermissionCreateInput
> {
  readonly findAll: Mock<PermissionsRepository['findAll']>;
  readonly findByName: Mock<PermissionsRepository['findByName']>;
}
