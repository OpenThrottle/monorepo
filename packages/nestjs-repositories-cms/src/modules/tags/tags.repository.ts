import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Tag } from './tag.entity.ts';

/**
 * @description Data access for the cms `tags` table on the cms connection: the
 * `BaseRepository` CRUD, keyed on `uuid` and soft deleting through `is_deleted`.
 * @public
 */
@Injectable()
export class TagsRepository extends BaseRepository<Tag, CreateModelInput<Tag>> {
  protected readonly tableName = 'tags';

  constructor(
    @InjectRepository(Tag, CMS_CONNECTION)
    repository: Repository<Tag>,
  ) {
    super(repository);
  }
}
