import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Tag } from './tag.entity.ts';
import { TagsService } from './tags.service.ts';

/**
 * @description Registers {@link Tag} on the cms connection and provides
 * {@link TagsService}.
 * @public
 */
@Module({
  exports: [TagsService],
  imports: [TypeOrmModule.forFeature([Tag], CMS_CONNECTION)],
  providers: [TagsService],
})
export class TagsModule {}
