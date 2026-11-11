import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { LayoutLibrary } from './layout-library.entity.ts';

/**
 * @description Thin data access for the cms `layouts_libraries` table.
 * @public
 */
@Injectable()
export class LayoutsLibrariesService {
  constructor(
    @InjectRepository(LayoutLibrary, CMS_CONNECTION)
    private readonly layoutLibraryRepository: Repository<LayoutLibrary>,
  ) {}

  /**
   * @description Returns the TypeORM repository for `layouts_libraries` on the cms
   * connection. Callers own ordering, pagination and soft-delete filtering.
   */
  getRepository(): Repository<LayoutLibrary> {
    return this.layoutLibraryRepository;
  }
}
