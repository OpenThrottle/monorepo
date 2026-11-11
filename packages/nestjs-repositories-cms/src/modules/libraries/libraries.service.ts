import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Library } from './library.entity.ts';

/**
 * @description Thin data access for the cms `libraries` table.
 * @public
 */
@Injectable()
export class LibrariesService {
  constructor(
    @InjectRepository(Library, CMS_CONNECTION)
    private readonly libraryRepository: Repository<Library>,
  ) {}

  /**
   * @description Returns the TypeORM repository for `libraries` on the cms
   * connection. Callers own ordering, pagination and soft-delete filtering.
   */
  getRepository(): Repository<Library> {
    return this.libraryRepository;
  }
}
