import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Schema } from './schema.entity.ts';

/**
 * @description Thin data access for the cms `schemas` table.
 * @public
 */
@Injectable()
export class SchemasService {
  constructor(
    @InjectRepository(Schema, CMS_CONNECTION)
    private readonly schemaRepository: Repository<Schema>,
  ) {}

  /**
   * @description Returns the TypeORM repository for `schemas` on the cms
   * connection. Callers own ordering, pagination and soft-delete filtering.
   */
  getRepository(): Repository<Schema> {
    return this.schemaRepository;
  }
}
