import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { LibraryComponent } from './library-component.entity.ts';

/**
 * @description Data access for the cms `library_components` table on the cms connection: the
 * `BaseRepository` CRUD, keyed on `uuid` and soft deleting through `is_deleted`.
 * @public
 */
@Injectable()
export class LibraryComponentsRepository extends BaseRepository<
  LibraryComponent,
  CreateModelInput<LibraryComponent>
> {
  protected readonly tableName = 'library_components';

  constructor(
    @InjectRepository(LibraryComponent, CMS_CONNECTION)
    repository: Repository<LibraryComponent>,
  ) {
    super(repository);
  }
}
