import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Tag } from './tag.entity.ts';

/**
 * @description Thin data access for the cms `tags` table.
 * @public
 */
@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag, CMS_CONNECTION)
    private readonly tagRepository: Repository<Tag>,
  ) {}

  /**
   * @description Returns the TypeORM repository for `tags` on the cms
   * connection. Callers own ordering, pagination and soft-delete filtering.
   */
  getRepository(): Repository<Tag> {
    return this.tagRepository;
  }
}
