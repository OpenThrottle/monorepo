/**
 * @description Typed error result: `updateBlogPost` was sent an `expectedUpdatedAt` that no
 * longer matches the post, i.e. someone else edited it since the caller read it. Nothing was
 * written; the caller reloads the post (or retries with `currentUpdatedAt`) and merges.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BlogPostStaleWriteError {
  @Field(() => Date, {
    description: `The post's updatedAt now; the value to send as expectedUpdatedAt after reloading.`,
  })
  currentUpdatedAt!: Date;

  @Field(() => String, { description: `Human-readable explanation.` })
  message!: string;
}
