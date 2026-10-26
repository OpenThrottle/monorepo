import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

import { BLOG_POST_STATUS } from './blog-post.constants.ts';
import type { BlogPost } from './blog-post.entity.ts';

/**
 * @description Derived lifecycle state of a post, as the authoring surface shows it. The
 * stored `status` has no SCHEDULED / LIVE: both are `PUBLISHED`, split by whether
 * `published_at` has been reached. Public visibility is exactly `LIVE`.
 * @public
 */
export const BLOG_POST_STATE = {
  ARCHIVED: 'ARCHIVED',
  DRAFT: 'DRAFT',
  LIVE: 'LIVE',
  SCHEDULED: 'SCHEDULED',
} as const;

/** @public */
export type BlogPostState =
  (typeof BLOG_POST_STATE)[keyof typeof BLOG_POST_STATE];

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

/**
 * @description The in-memory twin of {@link applyBlogPostVisibility} and
 * {@link applyBlogPostStateFilter}: derives a post's {@link BlogPostState}. DRAFT and ARCHIVED
 * mirror `status`; a PUBLISHED post is LIVE when `publishedAt <= now` (the boundary itself is
 * LIVE, matching the SQL `<= NOW()`) and SCHEDULED otherwise. A PUBLISHED post with no
 * `publishedAt` cannot exist (`chk_blog_posts_published_at`); it is reported as SCHEDULED, never
 * LIVE, so it can never look public.
 * @public
 */
export function deriveBlogPostState(
  post: Pick<BlogPost, 'publishedAt' | 'status'>,
  now: Date,
): BlogPostState {
  switch (post.status) {
    case BLOG_POST_STATUS.DRAFT:
      return BLOG_POST_STATE.DRAFT;
    case BLOG_POST_STATUS.ARCHIVED:
      return BLOG_POST_STATE.ARCHIVED;
    case BLOG_POST_STATUS.PUBLISHED:
      return post.publishedAt != null &&
        post.publishedAt.getTime() <= now.getTime()
        ? BLOG_POST_STATE.LIVE
        : BLOG_POST_STATE.SCHEDULED;
  }
}

/**
 * @description Restricts a query to posts in any of `states` (OR-ed), translated to SQL with
 * the same `NOW()` clock as {@link applyBlogPostVisibility}: DRAFT → `status = 'DRAFT'`,
 * ARCHIVED → `status = 'ARCHIVED'`, SCHEDULED → PUBLISHED with `published_at > NOW()`, LIVE →
 * PUBLISHED with `published_at <= NOW()`. An empty list applies no restriction.
 *
 * @param queryBuilder - Query builder that selects from, or joins, the blog post alias.
 * @param alias - The alias bound to `blog_posts` in `queryBuilder`.
 * @param states - States to include.
 * @public
 */
export function applyBlogPostStateFilter<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  alias: string,
  states: readonly BlogPostState[],
): SelectQueryBuilder<T> {
  const clauses = [...new Set(states)].map((state) => {
    switch (state) {
      case BLOG_POST_STATE.DRAFT:
        return `${alias}.status = :blogPostDraftStatus`;
      case BLOG_POST_STATE.ARCHIVED:
        return `${alias}.status = :blogPostArchivedStatus`;
      case BLOG_POST_STATE.SCHEDULED:
        return `(${alias}.status = :blogPostPublishedStatus AND ${alias}.publishedAt > NOW())`;
      case BLOG_POST_STATE.LIVE:
        return `(${alias}.status = :blogPostPublishedStatus AND ${alias}.publishedAt <= NOW())`;
    }
  });
  if (clauses.length === 0) return queryBuilder;

  return queryBuilder.andWhere(`(${clauses.join(' OR ')})`, {
    blogPostArchivedStatus: BLOG_POST_STATUS.ARCHIVED,
    blogPostDraftStatus: BLOG_POST_STATUS.DRAFT,
    blogPostPublishedStatus: BLOG_POST_STATUS.PUBLISHED,
  });
}
