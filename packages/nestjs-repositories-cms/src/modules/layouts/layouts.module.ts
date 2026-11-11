import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Layout } from './layout.entity.ts';
import { LayoutsService } from './layouts.service.ts';

/**
 * @description Registers {@link Layout} on the cms connection and provides
 * {@link LayoutsService}.
 * @public
 */
@Module({
  exports: [LayoutsService],
  imports: [TypeOrmModule.forFeature([Layout], CMS_CONNECTION)],
  providers: [LayoutsService],
})
export class LayoutsModule {}
