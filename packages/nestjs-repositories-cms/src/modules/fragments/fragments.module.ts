import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Fragment } from './fragment.entity.ts';
import { FragmentsService } from './fragments.service.ts';

/**
 * @description Registers {@link Fragment} on the cms connection and provides
 * {@link FragmentsService}.
 * @public
 */
@Module({
  exports: [FragmentsService],
  imports: [TypeOrmModule.forFeature([Fragment], CMS_CONNECTION)],
  providers: [FragmentsService],
})
export class FragmentsModule {}
