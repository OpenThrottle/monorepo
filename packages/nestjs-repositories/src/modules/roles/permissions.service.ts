/**
 * @description Service for permission entities. Use for listing and looking up permissions.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { Repository } from 'typeorm';
import type { DeepPartial } from 'typeorm/common/DeepPartial';
import { Permission } from './permission.entity';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {
    this.logger.debug('🔐 permissions 🔐');
  }

  getRepository(): Repository<Permission> {
    return this.permissionRepository;
  }

  /**
   * @description Finds a permission by id, or null if not found.
   */
  async findById(id: string): Promise<Permission | null> {
    return this.permissionRepository.findOne({ where: { id } });
  }

  /**
   * @description Finds a permission by name, or null if not found.
   */
  async findByName(name: string): Promise<Permission | null> {
    return this.permissionRepository.findOne({ where: { name } });
  }

  /**
   * @description Returns all permissions, ordered by name.
   */
  async findAll(): Promise<Permission[]> {
    return this.permissionRepository.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * @description Creates a new permission. Returns the saved entity.
   */
  async create(data: DeepPartial<Permission>): Promise<Permission> {
    const entity = this.permissionRepository.create(data);
    return this.permissionRepository.save(entity);
  }
}
