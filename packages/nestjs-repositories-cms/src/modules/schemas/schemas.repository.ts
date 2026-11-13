import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Schema } from './schema.entity.ts';

/**
 * @description Data access for the cms `schemas` table on the cms connection: the
 * `BaseRepository` CRUD, keyed on `uuid` and soft deleting through `is_deleted`.
 * @public
 */
@Injectable()
export class SchemasRepository extends BaseRepository<
  Schema,
  CreateModelInput<Schema>
> {
  protected readonly tableName = 'schemas';

  constructor(
    @InjectRepository(Schema, CMS_CONNECTION)
    repository: Repository<Schema>,
  ) {
    super(repository);
  }
}
