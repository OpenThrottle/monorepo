/**
 * @description Service for role entities, user-role assignments, and role-permission resolution.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';
import type { DeepPartial } from 'typeorm/common/DeepPartial';
import { User } from '../users/user.entity';
import { Permission } from './permission.entity';
import { Role } from './role.entity';

@Injectable()
export class RolesService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    this.logger.debug('🎭 roles 🎭');
  }

  getRepository(): Repository<Role> {
    return this.roleRepository;
  }

  /**
   * @description Returns all roles, ordered by name.
   */
  async findAll(): Promise<Role[]> {
    return this.roleRepository.find({
      order: { name: 'ASC' },
      relations: ['permissions'],
    });
  }

  /**
   * @description Finds a role by id, or null if not found.
   */
  async findById(id: string): Promise<Role | null> {
    return this.roleRepository.findOne({
      relations: ['permissions'],
      where: { id },
    });
  }

  /**
   * @description Finds a role by name, or null if not found.
   */
  async findByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({
      relations: ['permissions'],
      where: { name },
    });
  }

  /**
   * @description Returns role names assigned to the user (for JWT payload / RBAC guards).
   */
  async findRoleNamesByUserId(userId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({
      relations: ['roles'],
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
      relations: ['roles', 'roles.permissions'],
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
    const roles = await this.roleRepository.find({
      relations: ['permissions'],
    });
    const mapping: Record<string, string[]> = {};
    for (const role of roles) {
      mapping[role.name] = (role.permissions ?? []).map((p) => p.name);
    }
    return mapping;
  }

  /**
   * @description Creates a new role. Returns the saved entity.
   */
  async create(data: DeepPartial<Role>): Promise<Role> {
    const entity = this.roleRepository.create(data);
    return this.roleRepository.save(entity);
  }

  /**
   * @description Updates an existing role by id. Returns the saved entity or null if not found.
   */
  async update(id: string, data: DeepPartial<Role>): Promise<Role | null> {
    const existing = await this.roleRepository.findOne({ where: { id } });
    if (!existing) return null;
    this.roleRepository.merge(existing, data);
    return this.roleRepository.save(existing);
  }

  /**
   * @description Deletes a role by id. Returns true if deleted, false if not found.
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.roleRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * @description Assigns a role to a user. Idempotent (no-op if already assigned).
   */
  async assignRoleToUser(userId: string, roleId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      relations: ['roles'],
      where: { id: userId },
    });
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!user || !role) return false;
    const hasRole = user.roles?.some((r) => r.id === roleId);
    if (hasRole) return true;
    user.roles = [...(user.roles ?? []), role];
    await this.userRepository.save(user);
    return true;
  }

  /**
   * @description Removes a role from a user. Idempotent.
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      relations: ['roles'],
      where: { id: userId },
    });
    if (!user) return false;
    user.roles = (user.roles ?? []).filter((r) => r.id !== roleId);
    await this.userRepository.save(user);
    return true;
  }

  /**
   * @description Adds a permission to a role. Idempotent.
   */
  async addPermissionToRole(
    roleId: string,
    permissionId: string,
  ): Promise<boolean> {
    const role = await this.roleRepository.findOne({
      relations: ['permissions'],
      where: { id: roleId },
    });
    if (!role) return false;
    const permRepo = this.roleRepository.manager.getRepository(Permission);
    const permission = await permRepo.findOne({ where: { id: permissionId } });
    if (!permission) return false;
    const hasPerm = role.permissions?.some((p) => p.id === permissionId);
    if (hasPerm) return true;
    role.permissions = [...(role.permissions ?? []), permission];
    await this.roleRepository.save(role);
    return true;
  }

  /**
   * @description Removes a permission from a role. Idempotent.
   */
  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<boolean> {
    const role = await this.roleRepository.findOne({
      relations: ['permissions'],
      where: { id: roleId },
    });
    if (!role) return false;
    role.permissions = (role.permissions ?? []).filter(
      (p) => p.id !== permissionId,
    );
    await this.roleRepository.save(role);
    return true;
  }

  /**
   * @description Returns roles for a user (full entities with permissions).
   */
  async findRolesForUser(userId: string): Promise<Role[]> {
    const user = await this.userRepository.findOne({
      relations: ['roles', 'roles.permissions'],
      where: { id: userId },
    });
    return user?.roles ?? [];
  }
}
