import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Profile } from './profile.entity.ts';

/**
 * @description Data access for the cms `profiles` table on the cms connection: the
 * `BaseRepository` CRUD, keyed on `uuid` and soft deleting through `is_deleted`.
 * @public
 */
@Injectable()
export class ProfilesRepository extends BaseRepository<
  Profile,
  CreateModelInput<Profile>
> {
  protected readonly tableName = 'profiles';

  constructor(
    @InjectRepository(Profile, CMS_CONNECTION)
    repository: Repository<Profile>,
  ) {
    super(repository);
  }
}
