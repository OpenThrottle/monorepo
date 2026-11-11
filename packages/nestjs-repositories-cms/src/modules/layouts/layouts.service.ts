import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Layout } from './layout.entity.ts';

/**
 * @description Thin data access for the cms `layouts` table.
 * @public
 */
@Injectable()
export class LayoutsService {
  constructor(
    @InjectRepository(Layout, CMS_CONNECTION)
    private readonly layoutRepository: Repository<Layout>,
  ) {}

  /**
   * @description Returns the TypeORM repository for `layouts` on the cms
   * connection. Callers own ordering, pagination and soft-delete filtering.
   */
  getRepository(): Repository<Layout> {
    return this.layoutRepository;
  }
}
