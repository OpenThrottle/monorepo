import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { FragmentChild } from './fragment-child.entity.ts';

/**
 * @description Thin data access for the cms `fragments_children` table.
 * @public
 */
@Injectable()
export class FragmentsChildrenService {
  constructor(
    @InjectRepository(FragmentChild, CMS_CONNECTION)
    private readonly fragmentChildRepository: Repository<FragmentChild>,
  ) {}

  /**
   * @description Returns the TypeORM repository for `fragments_children` on the cms
   * connection. Callers own ordering, pagination and soft-delete filtering.
   */
  getRepository(): Repository<FragmentChild> {
    return this.fragmentChildRepository;
  }
}
