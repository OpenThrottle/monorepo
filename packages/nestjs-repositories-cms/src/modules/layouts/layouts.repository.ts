import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Layout } from './layout.entity.ts';

/**
 * @description Data access for the cms `layouts` table on the cms connection: the
 * `BaseRepository` CRUD, keyed on `uuid` and soft deleting through `is_deleted`.
 * @public
 */
@Injectable()
export class LayoutsRepository extends BaseRepository<
  Layout,
  CreateModelInput<Layout>
> {
  protected readonly tableName = 'layouts';

  constructor(
    @InjectRepository(Layout, CMS_CONNECTION)
    repository: Repository<Layout>,
  ) {
    super(repository);
  }
}
