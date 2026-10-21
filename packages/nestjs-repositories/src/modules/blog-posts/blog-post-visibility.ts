import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

import { BLOG_POST_STATUS } from './blog-post.constants.ts';

/**
 * @description THE single definition of public blog visibility: a post is publicly
 * visible iff `status = 'PUBLISHED' AND published_at <= now()`. Drafts, archived and
 * future-scheduled posts are never visible. Every query that serves the public site
 * (post lists, post by slug, tags that have a visible post) must route through this
 * function — never restate the rule.
 *
 * @param queryBuilder - Query builder that selects from, or joins, the blog post alias.
 * @param alias - The alias bound to `blog_posts` in `queryBuilder`.
 * @public
 */
export function applyBlogPostVisibility<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  alias: string,
): SelectQueryBuilder<T> {
  return queryBuilder
    .andWhere(`${alias}.status = :blogPostPublishedStatus`, {
      blogPostPublishedStatus: BLOG_POST_STATUS.PUBLISHED,
    })
    .andWhere(`${alias}.publishedAt <= NOW()`);
}
