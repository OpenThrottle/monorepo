/**
 * @description Domain service for rollout feature flags: CRUD plus role-targeted
 * evaluation (isEnabled / evaluateAll). Read side lives here; the write side and
 * evaluation are added alongside the unit-test matrix.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { RolesService } from '@openthrottle/nestjs-repositories';
import { Repository } from 'typeorm';
import { RolloutFlag } from './rollout-flag.entity';

@Injectable()
export class RolloutService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(RolloutFlag)
    private readonly rolloutFlagRepository: Repository<RolloutFlag>,
    private readonly rolesService: RolesService,
  ) {
    this.logger.debug('🚩 rollout 🚩');
  }

  /**
   * @description Returns all flags, ordered by key.
   */
  async findAll(): Promise<RolloutFlag[]> {
    return this.rolloutFlagRepository.find({ order: { key: 'ASC' } });
  }

  /**
   * @description Finds a flag by id, or null if not found.
   */
  async findById(id: string): Promise<RolloutFlag | null> {
    return this.rolloutFlagRepository.findOne({ where: { id } });
  }

  /**
   * @description Finds a flag by key, or null if not found.
   */
  async findByKey(key: string): Promise<RolloutFlag | null> {
    return this.rolloutFlagRepository.findOne({ where: { key } });
  }
}
