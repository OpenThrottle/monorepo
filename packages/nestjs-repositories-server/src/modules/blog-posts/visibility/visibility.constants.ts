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
