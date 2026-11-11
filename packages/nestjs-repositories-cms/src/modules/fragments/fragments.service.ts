import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Fragment } from './fragment.entity.ts';

/**
 * @description Thin data access for the cms `fragments` table.
 * @public
 */
@Injectable()
export class FragmentsService {
  constructor(
    @InjectRepository(Fragment, CMS_CONNECTION)
    private readonly fragmentRepository: Repository<Fragment>,
  ) {}

  /**
   * @description Returns the TypeORM repository for `fragments` on the cms
   * connection. Callers own ordering, pagination and soft-delete filtering.
   */
  getRepository(): Repository<Fragment> {
    return this.fragmentRepository;
  }
}
