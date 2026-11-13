import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Survey } from './survey.entity.ts';
import { SurveysRepository } from './surveys.repository.ts';

/**
 * @description Registers {@link Survey} on the cms connection and provides
 * {@link SurveysRepository}.
 * @public
 */
@Module({
  exports: [SurveysRepository],
  imports: [TypeOrmModule.forFeature([Survey], CMS_CONNECTION)],
  providers: [SurveysRepository],
})
export class SurveysModule {}
