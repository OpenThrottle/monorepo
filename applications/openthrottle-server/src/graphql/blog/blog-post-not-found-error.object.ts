/**
 * @description Typed error result: the blog post a mutation or admin query targeted (by id or
 * slug) does not exist. A missing AUTHOR or TAG referenced by slug is the separate
 * `BlogReferenceNotFoundError`.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BlogPostNotFoundError {
  @Field(() => String, { description: `Human-readable explanation.` })
  message!: string;
}
