import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { LayoutLibrary } from './layout-library.entity.ts';
import { LayoutsLibrariesService } from './layouts-libraries.service.ts';

/**
 * @description Registers {@link LayoutLibrary} on the cms connection and provides
 * {@link LayoutsLibrariesService}.
 * @public
 */
@Module({
  exports: [LayoutsLibrariesService],
  imports: [TypeOrmModule.forFeature([LayoutLibrary], CMS_CONNECTION)],
  providers: [LayoutsLibrariesService],
})
export class LayoutsLibrariesModule {}
