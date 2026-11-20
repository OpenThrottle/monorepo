/**
 * @description GraphQL resolver for roles and permissions. CRUD for roles, assign roles to users, manage role-permission links.
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS } from '@openthrottle/nestjs-rbac';
import { Permissions } from '@openthrottle/nestjs-rbac';
import type {
  Permission,
  Role,
} from '@openthrottle/nestjs-repositories-server';
import {
  PermissionsRepository,
  RolesRepository,
} from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { nullIfNotFound } from '../users/users.utils.ts';
import { PermissionObject } from './permission.object.ts';
import {
  AddPermissionToRoleInput,
  AssignRoleToUserInput,
  CreateRoleInput,
  RemovePermissionFromRoleInput,
  RemoveRoleFromUserInput,
  UpdateRoleInput,
} from './role.input.ts';
import { RoleObject } from './role.object.ts';

@Resolver(() => RoleObject)
@UseGuards(GqlPermissionsGuard)
export class RolesResolver {
  constructor(
    private readonly permissionsRepository: PermissionsRepository,
    private readonly rolesRepository: RolesRepository,
  ) {}

  // @ProfileResponseTime('RolesResolver.roles')
  @Query(() => [RoleObject], {
    description: `List all roles with their permissions`,
  })
  @Permissions(PERMISSIONS.USERS_READ)
  async roles(): Promise<Role[]> {
    return this.rolesRepository.findAll();
  }

  // @ProfileResponseTime('RolesResolver.role')
  @Query(() => RoleObject, {
    description: `Get a role by ID`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.USERS_READ)
  async role(@Args('id', { type: () => ID }) id: string): Promise<Role | null> {
    return this.rolesRepository.findOne({
      relations: {
        permissions: true,
      },
      where: { id },
    });
  }

  // @ProfileResponseTime('RolesResolver.permissions')
  @Query(() => [PermissionObject], {
    description: `List all permissions`,
  })
  @Permissions(PERMISSIONS.USERS_READ)
  async permissions(): Promise<Permission[]> {
    return this.permissionsRepository.findAll();
  }

  // @ProfileResponseTime('RolesResolver.rolesForUser')
  @Query(() => [RoleObject], {
    description: `Get roles assigned to a user`,
  })
  @Permissions(PERMISSIONS.USERS_READ)
  async rolesForUser(
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<Role[]> {
    return this.rolesRepository.findRolesForUser(userId);
  }

  // @ProfileResponseTime('RolesResolver.permissionsForUser')
  @Query(() => [String], {
    description: `Get permission names for a user (union of all their roles' permissions)`,
  })
  @Permissions(PERMISSIONS.USERS_READ)
  async permissionsForUser(
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<string[]> {
    return this.rolesRepository.getPermissionsForUser(userId);
  }

  // @ProfileResponseTime('RolesResolver.myPermissions')
  @Query(() => [String], {
    description: `Get permission names for the current user`,
  })
  @Permissions(PERMISSIONS.USERS_READ)
  async myPermissions(@CurrentUser('sub') userId: string): Promise<string[]> {
    return this.rolesRepository.getPermissionsForUser(userId);
  }

  // @ProfileResponseTime('RolesResolver.createRole')
  @Mutation(() => RoleObject, {
    description: `Create a role`,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async createRole(
    @Args('input', { type: () => CreateRoleInput }) input: CreateRoleInput,
  ): Promise<Role> {
    return this.rolesRepository.create({
      description: input.description ?? null,
      name: input.name,
    });
  }

  // @ProfileResponseTime('RolesResolver.updateRole')
  @Mutation(() => RoleObject, {
    description: `Update a role`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async updateRole(
    @Args('input', { type: () => UpdateRoleInput }) input: UpdateRoleInput,
  ): Promise<Role | null> {
    return nullIfNotFound(async () => {
      return this.rolesRepository.update(input.id, {
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.name != null && { name: input.name }),
      });
    });
  }

  // @ProfileResponseTime('RolesResolver.deleteRole')
  @Mutation(() => Boolean, {
    description: `Delete a role`,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async deleteRole(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    const removed = await nullIfNotFound(async () => {
      return this.rolesRepository.remove(id);
    });

    return removed != null;
  }

  // @ProfileResponseTime('RolesResolver.assignRoleToUser')
  @Mutation(() => Boolean, {
    description: `Assign a role to a user`,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async assignRoleToUser(
    @Args('input', { type: () => AssignRoleToUserInput })
    input: AssignRoleToUserInput,
  ): Promise<boolean> {
    return this.rolesRepository.assignRoleToUser(input.userId, input.roleId);
  }

  // @ProfileResponseTime('RolesResolver.removeRoleFromUser')
  @Mutation(() => Boolean, {
    description: `Remove a role from a user`,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async removeRoleFromUser(
    @Args('input', { type: () => RemoveRoleFromUserInput })
    input: RemoveRoleFromUserInput,
  ): Promise<boolean> {
    return this.rolesRepository.removeRoleFromUser(input.userId, input.roleId);
  }

  // @ProfileResponseTime('RolesResolver.addPermissionToRole')
  @Mutation(() => Boolean, {
    description: `Add a permission to a role`,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async addPermissionToRole(
    @Args('input', { type: () => AddPermissionToRoleInput })
    input: AddPermissionToRoleInput,
  ): Promise<boolean> {
    return this.rolesRepository.addPermissionToRole(
      input.roleId,
      input.permissionId,
    );
  }

  // @ProfileResponseTime('RolesResolver.removePermissionFromRole')
  @Mutation(() => Boolean, {
    description: `Remove a permission from a role`,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async removePermissionFromRole(
    @Args('input', { type: () => RemovePermissionFromRoleInput })
    input: RemovePermissionFromRoleInput,
  ): Promise<boolean> {
    return this.rolesRepository.removePermissionFromRole(
      input.roleId,
      input.permissionId,
    );
  }
}
