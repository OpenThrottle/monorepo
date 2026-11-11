import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { LibraryComponent } from './library-component.entity.ts';

/**
 * @description Thin data access for the cms `library_components` table.
 * @public
 */
@Injectable()
export class LibraryComponentsService {
  constructor(
    @InjectRepository(LibraryComponent, CMS_CONNECTION)
    private readonly libraryComponentRepository: Repository<LibraryComponent>,
  ) {}

  /**
   * @description Returns the TypeORM repository for `library_components` on the cms
   * connection. Callers own ordering, pagination and soft-delete filtering.
   */
  getRepository(): Repository<LibraryComponent> {
    return this.libraryComponentRepository;
  }
}
