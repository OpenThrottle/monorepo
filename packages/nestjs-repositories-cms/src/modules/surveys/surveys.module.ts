import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Survey } from './survey.entity.ts';
import { SurveysService } from './surveys.service.ts';

/**
 * @description Registers {@link Survey} on the cms connection and provides
 * {@link SurveysService}.
 * @public
 */
@Module({
  exports: [SurveysService],
  imports: [TypeOrmModule.forFeature([Survey], CMS_CONNECTION)],
  providers: [SurveysService],
})
export class SurveysModule {}
