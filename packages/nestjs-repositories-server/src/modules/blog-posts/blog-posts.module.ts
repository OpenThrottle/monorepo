import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BlogAuthor } from '../blog-authors/blog-author.entity.ts';
import { BlogTag } from '../blog-tags/blog-tag.entity.ts';
import { BlogPost } from './blog-post.entity.ts';
import { BlogPostsRepository } from './blog-posts.repository.ts';

/**
 * @description Registers {@link BlogPost} (plus the {@link BlogAuthor} and {@link BlogTag} it
 * resolves slugs against) on the default connection and provides {@link BlogPostsRepository}.
 * @public
 */
@Module({
  exports: [BlogPostsRepository],
  imports: [TypeOrmModule.forFeature([BlogPost, BlogAuthor, BlogTag])],
  providers: [BlogPostsRepository],
})
export class BlogPostsModule {}
