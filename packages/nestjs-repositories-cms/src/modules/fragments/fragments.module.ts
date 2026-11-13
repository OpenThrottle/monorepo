import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Fragment } from './fragment.entity.ts';
import { FragmentsRepository } from './fragments.repository.ts';

/**
 * @description Registers {@link Fragment} on the cms connection and provides
 * {@link FragmentsRepository}.
 * @public
 */
@Module({
  exports: [FragmentsRepository],
  imports: [TypeOrmModule.forFeature([Fragment], CMS_CONNECTION)],
  providers: [FragmentsRepository],
})
export class FragmentsModule {}
