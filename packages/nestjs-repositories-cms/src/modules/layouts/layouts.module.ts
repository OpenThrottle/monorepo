import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Layout } from './layout.entity.ts';
import { LayoutsRepository } from './layouts.repository.ts';

/**
 * @description Registers {@link Layout} on the cms connection and provides
 * {@link LayoutsRepository}.
 * @public
 */
@Module({
  exports: [LayoutsRepository],
  imports: [TypeOrmModule.forFeature([Layout], CMS_CONNECTION)],
  providers: [LayoutsRepository],
})
export class LayoutsModule {}
