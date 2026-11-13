import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Tag } from './tag.entity.ts';
import { TagsRepository } from './tags.repository.ts';

/**
 * @description Registers {@link Tag} on the cms connection and provides
 * {@link TagsRepository}.
 * @public
 */
@Module({
  exports: [TagsRepository],
  imports: [TypeOrmModule.forFeature([Tag], CMS_CONNECTION)],
  providers: [TagsRepository],
})
export class TagsModule {}
