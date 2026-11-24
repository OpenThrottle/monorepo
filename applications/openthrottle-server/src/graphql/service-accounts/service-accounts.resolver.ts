/**
 * @description Admin GraphQL for service accounts and credentials (human JWT + users:* permissions).
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS } from '@openthrottle/nestjs-rbac';
import { Permissions } from '@openthrottle/nestjs-rbac';
import type {
  Role,
  ServiceAccount,
  ServiceAccountCredential,
} from '@openthrottle/nestjs-repositories-server';
import {
  RolesRepository,
  ServiceAccountCredentialsRepository,
  ServiceAccountsRepository,
} from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { UserEnvFileService } from '../../services/user-env-file/user-env-file.service.ts';
import { RoleObject } from '../roles/role.object.ts';
import { nullIfNotFound } from '../users/users.utils.ts';
import { CreateServiceAccountCredentialResultObject } from './create-service-account-credential-result.object.ts';
import {
  AssignRoleToServiceAccountInput,
  CreateServiceAccountCredentialInput,
  CreateServiceAccountInput,
  RemoveRoleFromServiceAccountInput,
  UpdateServiceAccountInput,
} from './service-account.input.ts';
import { ServiceAccountObject } from './service-account.object.ts';
import { ServiceAccountCredentialObject } from './service-account-credential.object.ts';
import { assertHumanAuthPrincipal } from './service-accounts.utils.ts';

const toCredentialObject = (
  credential: ServiceAccountCredential,
): ServiceAccountCredentialObject => {
  return {
    createdAt: credential.createdAt,
    expiresAt: credential.expiresAt,
    id: credential.id,
    label: credential.label,
    lastUsedAt: credential.lastUsedAt,
    prefix: credential.prefix,
    revokedAt: credential.revokedAt,
    serviceAccountId: credential.serviceAccountId,
  };
};

@Resolver(() => ServiceAccountObject)
@UseGuards(GqlPermissionsGuard)
export class ServiceAccountsResolver {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly serviceAccountCredentialsRepository: ServiceAccountCredentialsRepository,
    private readonly serviceAccountsRepository: ServiceAccountsRepository,
    private readonly userEnvFileService: UserEnvFileService,
  ) {}

  @Query(() => [ServiceAccountObject], {
    description: `List all service accounts (admin, human only).`,
  })
  @Permissions(PERMISSIONS.USERS_READ)
  async serviceAccounts(
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<ServiceAccount[]> {
    assertHumanAuthPrincipal(principal);
    // The keys list has no pager, so keep the pre-25 default of 50.
    return this.serviceAccountsRepository.findAll(undefined, {
      defaultLimit: 50,
    });
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
    return this.serviceAccountsRepository.findOne({ where: { id } });
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
      await this.serviceAccountCredentialsRepository.findCredentials(
        serviceAccountId,
      );
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
    return this.rolesRepository.findRolesForServiceAccount(serviceAccountId);
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
    return this.rolesRepository.getPermissionsForServiceAccount(
      serviceAccountId,
    );
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
    return this.serviceAccountsRepository.create({
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
    return nullIfNotFound(async () => {
      return this.serviceAccountsRepository.update(input.id, {
        ...(input.actingUserId !== undefined && {
          actingUserId: input.actingUserId,
        }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.name != null && { name: input.name }),
      });
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
    return nullIfNotFound(async () => {
      return this.serviceAccountsRepository.disable(id);
    });
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
    return nullIfNotFound(async () => {
      return this.serviceAccountsRepository.enable(id);
    });
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
    const result =
      await this.serviceAccountCredentialsRepository.createCredential({
        expiresAt: input.expiresAt ?? null,
        label: input.label ?? null,
        serviceAccountId: input.serviceAccountId,
      });
    if (result == null) {
      return null;
    }
    // A new MCP credential is a rotation: point ~/.openthrottle/.env at it now
    // rather than at the next boot. Fail-open; never blocks the mutation.
    const account = await this.serviceAccountsRepository.findOne({
      where: { id: input.serviceAccountId },
    });
    if (account != null) {
      this.userEnvFileService.onCredentialMinted(account.name, result.token);
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
    return this.serviceAccountCredentialsRepository.revokeCredential(
      credentialId,
    );
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
    return this.rolesRepository.assignRoleToServiceAccount(
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
    return this.rolesRepository.removeRoleFromServiceAccount(
      input.serviceAccountId,
      input.roleId,
    );
  }
}
