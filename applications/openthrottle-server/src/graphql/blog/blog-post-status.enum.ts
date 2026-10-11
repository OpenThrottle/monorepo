/**
 * @description Registers the `BlogPostStatus` GraphQL enum from `BLOG_POST_STATUS` in
 * `@openthrottle/nestjs-repositories` (itself mirroring the `chk_blog_posts_status` CHECK), so SDL
 * and the database vocabulary stay in lockstep. Exposed only on the admin post object — the
 * public post object has no `status` (everything public is PUBLISHED by construction).
 */

import { registerEnumType } from '@nestjs/graphql';
import { BLOG_POST_STATUS } from '@openthrottle/nestjs-repositories';

registerEnumType(BLOG_POST_STATUS, {
  description: `Lifecycle of a blog post. Only PUBLISHED posts whose publishedAt has passed are publicly visible; a PUBLISHED post with a future publishedAt is scheduled.`,
  name: 'BlogPostStatus',
});

export { BLOG_POST_STATUS as BlogPostStatusEnum };
