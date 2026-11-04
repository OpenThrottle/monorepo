/**
 * @description Registers the `BlogPostState` GraphQL enum from `BLOG_POST_STATE` in
 * `@openthrottle/nestjs-repositories`. Unlike the stored `BlogPostStatus`, the state splits
 * PUBLISHED into LIVE (publishedAt reached, publicly visible) and SCHEDULED (publishedAt in
 * the future), which is what an editor needs to see and filter by.
 */

import { registerEnumType } from '@nestjs/graphql';
import { BLOG_POST_STATE } from '@openthrottle/nestjs-repositories';

registerEnumType(BLOG_POST_STATE, {
  description: `Derived lifecycle state of a blog post as the authoring surface shows it. LIVE is the only publicly visible state; SCHEDULED is PUBLISHED with a future publishedAt.`,
  name: 'BlogPostState',
});

export { BLOG_POST_STATE as BlogPostStateEnum };
