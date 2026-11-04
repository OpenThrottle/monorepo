/**
 * @description Maps blog entities to their public GraphQL objects. Fields are picked one by one
 * (never spread) so internal columns — `userId`, `status`, `authorId`, timestamps the public
 * schema does not expose — cannot leak into the response by accident.
 */

import type {
  BlogAuthor,
  BlogPost,
  BlogTag,
} from '@openthrottle/nestjs-repositories';

import type { BlogAuthorObject } from './blog-author.object.ts';
import type { BlogPostObject } from './blog-post.object.ts';
import type { BlogTagObject } from './blog-tag.object.ts';
import { readingTimeMinutes } from './reading-time-minutes.ts';

export const toBlogAuthorObject = (author: BlogAuthor): BlogAuthorObject => ({
  avatarUrl: author.avatarUrl,
  bio: author.bio,
  displayName: author.displayName,
  slug: author.slug,
});

export const toBlogTagObject = (tag: BlogTag): BlogTagObject => ({
  description: tag.description,
  name: tag.name,
  slug: tag.slug,
});

export const toBlogPostObject = (post: BlogPost): BlogPostObject => ({
  author: post.author == null ? null : toBlogAuthorObject(post.author),
  bodyMarkdown: post.bodyMarkdown,
  coverImageAlt: post.coverImageAlt,
  coverImageUrl: post.coverImageUrl,
  excerpt: post.excerpt,
  id: post.id,
  publishedAt: post.publishedAt,
  readingTimeMinutes: readingTimeMinutes(post.bodyMarkdown),
  seoDescription: post.seoDescription,
  seoTitle: post.seoTitle,
  slug: post.slug,
  tags: post.tags.map(toBlogTagObject),
  title: post.title,
  updatedAt: post.updatedAt,
});
