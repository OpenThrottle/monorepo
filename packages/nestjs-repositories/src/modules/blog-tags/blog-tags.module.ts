import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { BlogTag } from './blog-tag.entity.ts';
import { BlogTagsService } from './blog-tags.service.ts';

/** @public */
@Module({
  controllers: [],
  exports: [BlogTagsService],
  imports: [LoggerModule, TypeOrmModule.forFeature([BlogTag])],
  providers: [BlogTagsService],
})
export class BlogTagsModule {}
