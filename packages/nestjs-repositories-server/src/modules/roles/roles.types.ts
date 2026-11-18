import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { Role } from './role.entity.ts';
import type { RolesRepository } from './roles.repository.ts';

/**
 * Scalar/column fields of Role (no relations, no `deletedAt`).
 * @public
 */
export type RoleData = Pick<
  Role,
  'createdAt' | 'description' | 'id' | 'name' | 'updatedAt'
>;

/**
 * @description What `RolesRepository.create` takes: the role's columns, with the permission,
 * user and service-account relations left out and `description` optional. `name` is required.
 * @public
 */
export interface RoleCreateInput
  extends
    Omit<
      CreateModelInput<Role>,
      'description' | 'permissions' | 'serviceAccounts' | 'users'
    >,
    Partial<Pick<CreateModelInput<Role>, 'description'>> {}

/**
 * @description A {@link RolesRepository} mock: every inherited `BaseRepository` method plus
 * the role ones.
 * @public
 */
export interface RolesRepositoryMock extends BaseRepositoryMock<
  Role,
  RoleCreateInput
> {
  readonly addPermissionToRole: Mock<RolesRepository['addPermissionToRole']>;
  readonly assignRoleToServiceAccount: Mock<
    RolesRepository['assignRoleToServiceAccount']
  >;
  readonly assignRoleToUser: Mock<RolesRepository['assignRoleToUser']>;
  readonly findAll: Mock<RolesRepository['findAll']>;
  readonly findByName: Mock<RolesRepository['findByName']>;
  readonly findRoleNamesByServiceAccountId: Mock<
    RolesRepository['findRoleNamesByServiceAccountId']
  >;
  readonly findRoleNamesByUserId: Mock<
    RolesRepository['findRoleNamesByUserId']
  >;
  readonly findRolesForServiceAccount: Mock<
    RolesRepository['findRolesForServiceAccount']
  >;
  readonly findRolesForUser: Mock<RolesRepository['findRolesForUser']>;
  readonly getPermissionsForServiceAccount: Mock<
    RolesRepository['getPermissionsForServiceAccount']
  >;
  readonly getPermissionsForUser: Mock<
    RolesRepository['getPermissionsForUser']
  >;
  readonly getRoleToPermissionsMapping: Mock<
    RolesRepository['getRoleToPermissionsMapping']
  >;
  readonly removePermissionFromRole: Mock<
    RolesRepository['removePermissionFromRole']
  >;
  readonly removeRoleFromServiceAccount: Mock<
    RolesRepository['removeRoleFromServiceAccount']
  >;
  readonly removeRoleFromUser: Mock<RolesRepository['removeRoleFromUser']>;
}
