import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Survey } from './survey.entity.ts';

/**
 * @description Data access for the cms `surveys` table on the cms connection: the
 * `BaseRepository` CRUD, keyed on `uuid` and soft deleting through `is_deleted`.
 * @public
 */
@Injectable()
export class SurveysRepository extends BaseRepository<
  Survey,
  CreateModelInput<Survey>
> {
  protected readonly tableName = 'surveys';

  constructor(
    @InjectRepository(Survey, CMS_CONNECTION)
    repository: Repository<Survey>,
  ) {
    super(repository);
  }
}
