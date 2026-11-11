import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Survey } from './survey.entity.ts';

/**
 * @description Thin data access for the cms `surveys` table.
 * @public
 */
@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(Survey, CMS_CONNECTION)
    private readonly surveyRepository: Repository<Survey>,
  ) {}

  /**
   * @description Returns the TypeORM repository for `surveys` on the cms
   * connection. Callers own ordering, pagination and soft-delete filtering.
   */
  getRepository(): Repository<Survey> {
    return this.surveyRepository;
  }
}
