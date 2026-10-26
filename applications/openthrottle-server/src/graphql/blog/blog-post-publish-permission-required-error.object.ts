/**
 * @description Typed error result: the caller holds `blog:draft` but the post is no longer a
 * DRAFT (published, scheduled or archived), and editing it needs `blog:write`. Nothing was
 * written. Returned by `updateBlogPost` and `setBlogPostTags` only.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BlogPostPublishPermissionRequiredError {
  @Field(() => String, { description: `Human-readable explanation.` })
  message!: string;
}
