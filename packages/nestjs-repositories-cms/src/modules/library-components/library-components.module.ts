import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { LibraryComponent } from './library-component.entity.ts';
import { LibraryComponentsRepository } from './library-components.repository.ts';

/**
 * @description Registers {@link LibraryComponent} on the cms connection and provides
 * {@link LibraryComponentsRepository}.
 * @public
 */
@Module({
  exports: [LibraryComponentsRepository],
  imports: [TypeOrmModule.forFeature([LibraryComponent], CMS_CONNECTION)],
  providers: [LibraryComponentsRepository],
})
export class LibraryComponentsModule {}
