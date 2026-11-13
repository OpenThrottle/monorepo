import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Schema } from './schema.entity.ts';
import { SchemasRepository } from './schemas.repository.ts';

/**
 * @description Registers {@link Schema} on the cms connection and provides
 * {@link SchemasRepository}.
 * @public
 */
@Module({
  exports: [SchemasRepository],
  imports: [TypeOrmModule.forFeature([Schema], CMS_CONNECTION)],
  providers: [SchemasRepository],
})
export class SchemasModule {}
