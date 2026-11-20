import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { Permission } from '../permissions/permission.entity.ts';
import { ServiceAccount } from '../service-accounts/service-account.entity.ts';
import { User } from '../users/user.entity.ts';
import { Role } from './role.entity.ts';
import type { RoleCreateInput } from './roles.types.ts';

/**
 * @description Data access for the openthrottle `roles` table on the default connection: the
 * `BaseRepository` CRUD plus user and service-account role assignment, role-permission
 * editing and permission resolution for RBAC. A delete is a soft delete, and a soft-deleted
 * role grants nothing: relation loading reads live roles only.
 * @public
 */
@Injectable()
export class RolesRepository extends BaseRepository<Role, RoleCreateInput> {
  protected readonly tableName = 'roles';

  constructor(
    @InjectRepository(Role)
    repository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ServiceAccount)
    private readonly serviceAccountRepository: Repository<ServiceAccount>,
  ) {
    super(repository);
  }

  /**
   * @description Returns all live roles with their permissions, ordered by name.
   */
  async findAll(): Promise<Role[]> {
    return this.repository.find({
      order: { name: 'ASC' },
      relations: {
        permissions: true,
      },
    });
  }

  /**
   * @description Finds a live role by name (with its permissions), or null if not found.
   */
  async findByName(name: string): Promise<Role | null> {
    return this.repository.findOne({
      relations: {
        permissions: true,
      },
      where: { name },
    });
  }

  /**
   * @description Returns role names assigned to the user (for JWT payload / RBAC guards).
   */
  async findRoleNamesByUserId(userId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({
      relations: {
        roles: true,
      },
      where: { id: userId },
    });
    if (!user?.roles) return [];
    return user.roles.map((r) => r.name);
  }

  /**
   * @description Returns all permission names for the user (union of permissions from all their roles).
   */
  async getPermissionsForUser(userId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({
      relations: {
        roles: {
          permissions: true,
        },
      },
      where: { id: userId },
    });

    if (!user?.roles) return [];
    const set = new Set<string>();

    for (const role of user.roles) {
      for (const p of role.permissions ?? []) {
        set.add(p.name);
      }
    }

    return Array.from(set);
  }

  /**
   * @description Returns mapping role name -> permission names for use by RBAC guards.
   */
  async getRoleToPermissionsMapping(): Promise<
    Readonly<Record<string, readonly string[]>>
  > {
    const roles = await this.repository.find({
      relations: {
        permissions: true,
      },
    });
    const mapping: Record<string, string[]> = {};
    for (const role of roles) {
      mapping[role.name] = (role.permissions ?? []).map((p) => p.name);
    }
    return mapping;
  }

  /**
   * @description Assigns a role to a user. Idempotent (no-op if already assigned). False when
   * the user or the (live) role is missing.
   */
  async assignRoleToUser(userId: string, roleId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      relations: {
        roles: true,
      },
      where: { id: userId },
    });
    const role = await this.repository.findOne({ where: { id: roleId } });
    if (!user || !role) return false;
    const hasRole = user.roles?.some((r) => r.id === roleId);
    if (hasRole) return true;
    user.roles = [...(user.roles ?? []), role];
    await this.userRepository.save(user);
    return true;
  }

  /**
   * @description Removes a role from a user. Idempotent. False when the user is missing.
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      relations: {
        roles: true,
      },
      where: { id: userId },
    });
    if (!user) return false;
    user.roles = (user.roles ?? []).filter((r) => r.id !== roleId);
    await this.userRepository.save(user);
    return true;
  }

  /**
   * @description Adds a permission to a role. Idempotent. False when the role or the
   * permission is missing.
   */
  async addPermissionToRole(
    roleId: string,
    permissionId: string,
  ): Promise<boolean> {
    const role = await this.repository.findOne({
      relations: {
        permissions: true,
      },
      where: { id: roleId },
    });
    if (!role) return false;
    const permRepo = this.repository.manager.getRepository(Permission);
    const permission = await permRepo.findOne({ where: { id: permissionId } });
    if (!permission) return false;
    const hasPerm = role.permissions?.some((p) => p.id === permissionId);
    if (hasPerm) return true;
    role.permissions = [...(role.permissions ?? []), permission];
    await this.repository.save(role);
    return true;
  }

  /**
   * @description Removes a permission from a role. Idempotent. False when the role is missing.
   */
  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<boolean> {
    const role = await this.repository.findOne({
      relations: {
        permissions: true,
      },
      where: { id: roleId },
    });
    if (!role) return false;
    role.permissions = (role.permissions ?? []).filter(
      (p) => p.id !== permissionId,
    );
    await this.repository.save(role);
    return true;
  }

  /**
   * @description Returns live roles for a user (full entities with permissions).
   */
  async findRolesForUser(userId: string): Promise<Role[]> {
    const user = await this.userRepository.findOne({
      relations: {
        roles: {
          permissions: true,
        },
      },
      where: { id: userId },
    });
    return user?.roles ?? [];
  }

  /**
   * @description Returns role names assigned to the service account (for RBAC / CLS).
   */
  async findRoleNamesByServiceAccountId(
    serviceAccountId: string,
  ): Promise<string[]> {
    const account = await this.serviceAccountRepository.findOne({
      relations: {
        roles: true,
      },
      where: { id: serviceAccountId },
    });
    if (!account?.roles) return [];
    return account.roles.map((r) => r.name);
  }

  /**
   * @description Returns all permission names for the service account (union across roles).
   */
  async getPermissionsForServiceAccount(
    serviceAccountId: string,
  ): Promise<string[]> {
    const account = await this.serviceAccountRepository.findOne({
      relations: {
        roles: {
          permissions: true,
        },
      },
      where: { id: serviceAccountId },
    });

    if (!account?.roles) return [];
    const set = new Set<string>();

    for (const role of account.roles) {
      for (const p of role.permissions ?? []) {
        set.add(p.name);
      }
    }

    return Array.from(set);
  }

  /**
   * @description Returns live roles for a service account (full entities with permissions).
   */
  async findRolesForServiceAccount(serviceAccountId: string): Promise<Role[]> {
    const account = await this.serviceAccountRepository.findOne({
      relations: {
        roles: {
          permissions: true,
        },
      },
      where: { id: serviceAccountId },
    });
    return account?.roles ?? [];
  }

  /**
   * @description Assigns a role to a service account. Idempotent (no-op if already assigned).
   * False when the account or the (live) role is missing.
   */
  async assignRoleToServiceAccount(
    serviceAccountId: string,
    roleId: string,
  ): Promise<boolean> {
    const account = await this.serviceAccountRepository.findOne({
      relations: {
        roles: true,
      },
      where: { id: serviceAccountId },
    });
    const role = await this.repository.findOne({ where: { id: roleId } });
    if (!account || !role) return false;
    const hasRole = account.roles?.some((r) => r.id === roleId);
    if (hasRole) return true;
    account.roles = [...(account.roles ?? []), role];
    await this.serviceAccountRepository.save(account);
    return true;
  }

  /**
   * @description Removes a role from a service account. Idempotent. False when the account is
   * missing.
   */
  async removeRoleFromServiceAccount(
    serviceAccountId: string,
    roleId: string,
  ): Promise<boolean> {
    const account = await this.serviceAccountRepository.findOne({
      relations: {
        roles: true,
      },
      where: { id: serviceAccountId },
    });
    if (!account) return false;
    account.roles = (account.roles ?? []).filter((r) => r.id !== roleId);
    await this.serviceAccountRepository.save(account);
    return true;
  }
}
