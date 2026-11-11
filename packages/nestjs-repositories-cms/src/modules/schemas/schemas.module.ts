import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Schema } from './schema.entity.ts';
import { SchemasService } from './schemas.service.ts';

/**
 * @description Registers {@link Schema} on the cms connection and provides
 * {@link SchemasService}.
 * @public
 */
@Module({
  exports: [SchemasService],
  imports: [TypeOrmModule.forFeature([Schema], CMS_CONNECTION)],
  providers: [SchemasService],
})
export class SchemasModule {}
