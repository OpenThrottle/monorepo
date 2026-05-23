/**
 * @description Admin GraphQL for service accounts and credentials (human JWT + users:* permissions).
 */

import type {
  Role,
  ServiceAccount,
  ServiceAccountCredential,
} from '@openthrottle/nestjs-repositories';
import {
  RolesService,
  ServiceAccountsService,
} from '@openthrottle/nestjs-repositories';
import { type AuthPrincipal, CurrentUser } from '@openthrottle/nestjs-auth';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@openthrottle/nestjs-rbac';
import { Permissions } from '@openthrottle/nestjs-rbac';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { assertHumanAuthPrincipal } from './assert-human-auth-principal';
import { CreateServiceAccountCredentialResultObject } from './create-service-account-credential-result.object';
import {
  AssignRoleToServiceAccountInput,
  CreateServiceAccountCredentialInput,
  CreateServiceAccountInput,
  RemoveRoleFromServiceAccountInput,
  UpdateServiceAccountInput,
} from './service-account.input';
import { ServiceAccountCredentialObject } from './service-account-credential.object';
import { ServiceAccountObject } from './service-account.object';
import { RoleObject } from '../roles/role.object';

const toCredentialObject = (
  credential: ServiceAccountCredential,
): ServiceAccountCredentialObject => ({
  createdAt: credential.createdAt,
  expiresAt: credential.expiresAt,
  id: credential.id,
  label: credential.label,
  lastUsedAt: credential.lastUsedAt,
  prefix: credential.prefix,
  revokedAt: credential.revokedAt,
  serviceAccountId: credential.serviceAccountId,
});

@Resolver(() => ServiceAccountObject)
@UseGuards(GqlPermissionsGuard)
export class ServiceAccountsResolver {
  constructor(
    private readonly rolesService: RolesService,
    private readonly serviceAccountsService: ServiceAccountsService,
  ) {}

  @Query(() => [ServiceAccountObject], {
    description: `List all service accounts (admin, human only).`,
  })
  @Permissions(PERMISSIONS.USERS_READ)
  async serviceAccounts(
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<ServiceAccount[]> {
    assertHumanAuthPrincipal(principal);
    return this.serviceAccountsService.findAll();
  }

  @Query(() => ServiceAccountObject, {
    description: `Get a service account by ID (admin, human only).`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.USERS_READ)
  async serviceAccount(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ServiceAccount | null> {
    assertHumanAuthPrincipal(principal);
    return this.serviceAccountsService.findById(id);
  }

  @Query(() => [ServiceAccountCredentialObject], {
    description: `List credentials for a service account, including revoked (admin, human only).`,
  })
  @Permissions(PERMISSIONS.USERS_READ)
  async serviceAccountCredentials(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('serviceAccountId', { type: () => ID }) serviceAccountId: string,
  ): Promise<ServiceAccountCredentialObject[]> {
    assertHumanAuthPrincipal(principal);
    const credentials =
      await this.serviceAccountsService.findCredentials(serviceAccountId);
    return credentials.map(toCredentialObject);
  }

  @Query(() => [RoleObject], {
    description: `Roles assigned to a service account (admin, human only).`,
  })
  @Permissions(PERMISSIONS.USERS_READ)
  async rolesForServiceAccount(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('serviceAccountId', { type: () => ID }) serviceAccountId: string,
  ): Promise<Role[]> {
    assertHumanAuthPrincipal(principal);
    return this.rolesService.findRolesForServiceAccount(serviceAccountId);
  }

  @Query(() => [String], {
    description: `Permission names for a service account (union of role permissions).`,
  })
  @Permissions(PERMISSIONS.USERS_READ)
  async permissionsForServiceAccount(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('serviceAccountId', { type: () => ID }) serviceAccountId: string,
  ): Promise<string[]> {
    assertHumanAuthPrincipal(principal);
    return this.rolesService.getPermissionsForServiceAccount(serviceAccountId);
  }

  @Mutation(() => ServiceAccountObject, {
    description: `Create a service account (admin, human only).`,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async createServiceAccount(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => CreateServiceAccountInput })
    input: CreateServiceAccountInput,
  ): Promise<ServiceAccount> {
    assertHumanAuthPrincipal(principal);
    return this.serviceAccountsService.create({
      description: input.description ?? null,
      name: input.name,
    });
  }

  @Mutation(() => ServiceAccountObject, {
    description: `Update a service account (admin, human only).`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async updateServiceAccount(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => UpdateServiceAccountInput })
    input: UpdateServiceAccountInput,
  ): Promise<ServiceAccount | null> {
    assertHumanAuthPrincipal(principal);
    return this.serviceAccountsService.update(input.id, {
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.name != null && { name: input.name }),
    });
  }

  @Mutation(() => ServiceAccountObject, {
    description: `Disable a service account (admin, human only).`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async disableServiceAccount(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ServiceAccount | null> {
    assertHumanAuthPrincipal(principal);
    return this.serviceAccountsService.disable(id);
  }

  @Mutation(() => ServiceAccountObject, {
    description: `Re-enable a disabled service account (admin, human only).`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async enableServiceAccount(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ServiceAccount | null> {
    assertHumanAuthPrincipal(principal);
    return this.serviceAccountsService.enable(id);
  }

  @Mutation(() => CreateServiceAccountCredentialResultObject, {
    description: `Create a credential; returns plaintext token once (admin, human only).`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async createServiceAccountCredential(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => CreateServiceAccountCredentialInput })
    input: CreateServiceAccountCredentialInput,
  ): Promise<CreateServiceAccountCredentialResultObject | null> {
    assertHumanAuthPrincipal(principal);
    const result = await this.serviceAccountsService.createCredential({
      expiresAt: input.expiresAt ?? null,
      label: input.label ?? null,
      serviceAccountId: input.serviceAccountId,
    });
    if (result == null) {
      return null;
    }
    return {
      credential: toCredentialObject(result.credential),
      token: result.token,
    };
  }

  @Mutation(() => Boolean, {
    description: `Revoke a service account credential (admin, human only).`,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async revokeServiceAccountCredential(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('credentialId', { type: () => ID }) credentialId: string,
  ): Promise<boolean> {
    assertHumanAuthPrincipal(principal);
    return this.serviceAccountsService.revokeCredential(credentialId);
  }

  @Mutation(() => Boolean, {
    description: `Assign a role to a service account (admin, human only).`,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async assignRoleToServiceAccount(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => AssignRoleToServiceAccountInput })
    input: AssignRoleToServiceAccountInput,
  ): Promise<boolean> {
    assertHumanAuthPrincipal(principal);
    return this.rolesService.assignRoleToServiceAccount(
      input.serviceAccountId,
      input.roleId,
    );
  }

  @Mutation(() => Boolean, {
    description: `Remove a role from a service account (admin, human only).`,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async removeRoleFromServiceAccount(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => RemoveRoleFromServiceAccountInput })
    input: RemoveRoleFromServiceAccountInput,
  ): Promise<boolean> {
    assertHumanAuthPrincipal(principal);
    return this.rolesService.removeRoleFromServiceAccount(
      input.serviceAccountId,
      input.roleId,
    );
  }
}
