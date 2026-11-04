import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { BlogAuthor } from '../blog-authors/blog-author.entity.ts';
import { BlogTag } from '../blog-tags/blog-tag.entity.ts';
import { BlogPost } from './blog-post.entity.ts';
import { BlogPostsService } from './blog-posts.service.ts';

/** @public */
@Module({
  controllers: [],
  exports: [BlogPostsService],
  imports: [
    LoggerModule,
    TypeOrmModule.forFeature([BlogPost, BlogAuthor, BlogTag]),
  ],
  providers: [BlogPostsService],
})
export class BlogPostsModule {}
