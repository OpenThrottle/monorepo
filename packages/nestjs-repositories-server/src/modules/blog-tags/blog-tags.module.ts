import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BlogTag } from './blog-tag.entity.ts';
import { BlogTagsRepository } from './blog-tags.repository.ts';

/**
 * @description Registers {@link BlogTag} on the default connection and provides
 * {@link BlogTagsRepository}.
 * @public
 */
@Module({
  exports: [BlogTagsRepository],
  imports: [TypeOrmModule.forFeature([BlogTag])],
  providers: [BlogTagsRepository],
})
export class BlogTagsModule {}
