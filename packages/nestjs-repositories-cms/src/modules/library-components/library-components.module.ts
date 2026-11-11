import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { LibraryComponent } from './library-component.entity.ts';
import { LibraryComponentsService } from './library-components.service.ts';

/**
 * @description Registers {@link LibraryComponent} on the cms connection and provides
 * {@link LibraryComponentsService}.
 * @public
 */
@Module({
  exports: [LibraryComponentsService],
  imports: [TypeOrmModule.forFeature([LibraryComponent], CMS_CONNECTION)],
  providers: [LibraryComponentsService],
})
export class LibraryComponentsModule {}
