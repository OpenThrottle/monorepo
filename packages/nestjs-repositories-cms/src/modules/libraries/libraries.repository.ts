import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Library } from './library.entity.ts';

/**
 * @description Data access for the cms `libraries` table on the cms connection: the
 * `BaseRepository` CRUD, keyed on `uuid` and soft deleting through `is_deleted`.
 * @public
 */
@Injectable()
export class LibrariesRepository extends BaseRepository<
  Library,
  CreateModelInput<Library>
> {
  protected readonly tableName = 'libraries';

  constructor(
    @InjectRepository(Library, CMS_CONNECTION)
    repository: Repository<Library>,
  ) {
    super(repository);
  }
}
