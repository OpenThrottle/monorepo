/**
 * @description Maps a blog post entity (loaded with author and tags) to the admin GraphQL
 * object. Fields are picked one by one, never spread, so `authorId` and any future column
 * cannot leak by accident.
 */

import type { BlogPost } from '@openthrottle/nestjs-repositories';

import type { BlogPostAdminObject } from './blog-post-admin.object.ts';
import { toBlogAuthorObject, toBlogTagObject } from './to-blog-post-object.ts';

export const toBlogPostAdminObject = (post: BlogPost): BlogPostAdminObject => ({
  author: post.author == null ? null : toBlogAuthorObject(post.author),
  bodyMarkdown: post.bodyMarkdown,
  coverImageAlt: post.coverImageAlt,
  coverImageUrl: post.coverImageUrl,
  createdAt: post.createdAt,
  excerpt: post.excerpt,
  id: post.id,
  publishedAt: post.publishedAt,
  seoDescription: post.seoDescription,
  seoTitle: post.seoTitle,
  slug: post.slug,
  status: post.status,
  tags: post.tags.map(toBlogTagObject),
  title: post.title,
  updatedAt: post.updatedAt,
});
