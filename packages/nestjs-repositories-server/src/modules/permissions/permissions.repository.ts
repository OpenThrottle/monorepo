import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { Permission } from './permission.entity.ts';
import type { PermissionCreateInput } from './permissions.types.ts';

/**
 * @description Data access for the openthrottle `permissions` table on the default
 * connection: the `BaseRepository` CRUD plus the name lookup and the alphabetical list. The
 * table is hard delete, and permissions are seeded by migrations.
 * @public
 */
@Injectable()
export class PermissionsRepository extends BaseRepository<
  Permission,
  PermissionCreateInput
> {
  protected readonly tableName = 'permissions';

  constructor(
    @InjectRepository(Permission)
    repository: Repository<Permission>,
  ) {
    super(repository);
  }

  /**
   * @description Finds a permission by name, or null if not found.
   */
  async findByName(name: string): Promise<Permission | null> {
    return this.repository.findOne({ where: { name } });
  }

  /**
   * @description Returns all permissions, ordered by name.
   */
  async findAll(): Promise<Permission[]> {
    return this.repository.find({ order: { name: 'ASC' } });
  }
}
