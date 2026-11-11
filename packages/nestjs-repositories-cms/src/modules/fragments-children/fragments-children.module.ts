import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { FragmentChild } from './fragment-child.entity.ts';
import { FragmentsChildrenService } from './fragments-children.service.ts';

/**
 * @description Registers {@link FragmentChild} on the cms connection and provides
 * {@link FragmentsChildrenService}.
 * @public
 */
@Module({
  exports: [FragmentsChildrenService],
  imports: [TypeOrmModule.forFeature([FragmentChild], CMS_CONNECTION)],
  providers: [FragmentsChildrenService],
})
export class FragmentsChildrenModule {}
