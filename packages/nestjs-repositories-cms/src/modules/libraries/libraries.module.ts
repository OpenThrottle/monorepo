import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { LibrariesService } from './libraries.service.ts';
import { Library } from './library.entity.ts';

/**
 * @description Registers {@link Library} on the cms connection and provides
 * {@link LibrariesService}.
 * @public
 */
@Module({
  exports: [LibrariesService],
  imports: [TypeOrmModule.forFeature([Library], CMS_CONNECTION)],
  providers: [LibrariesService],
})
export class LibrariesModule {}
