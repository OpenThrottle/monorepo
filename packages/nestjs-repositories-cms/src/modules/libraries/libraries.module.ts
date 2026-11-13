import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { LibrariesRepository } from './libraries.repository.ts';
import { Library } from './library.entity.ts';

/**
 * @description Registers {@link Library} on the cms connection and provides
 * {@link LibrariesRepository}.
 * @public
 */
@Module({
  exports: [LibrariesRepository],
  imports: [TypeOrmModule.forFeature([Library], CMS_CONNECTION)],
  providers: [LibrariesRepository],
})
export class LibrariesModule {}
