import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Profile } from './profile.entity.ts';

/**
 * @description Thin data access for the cms `profiles` table.
 * @public
 */
@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile, CMS_CONNECTION)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  /**
   * @description Returns the TypeORM repository for `profiles` on the cms
   * connection. Callers own ordering, pagination and soft-delete filtering.
   */
  getRepository(): Repository<Profile> {
    return this.profileRepository;
  }
}
