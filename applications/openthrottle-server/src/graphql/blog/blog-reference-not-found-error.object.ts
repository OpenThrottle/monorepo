/**
 * @description Typed error result: an author or tag a write referenced by slug does not exist
 * (an unknown `authorSlug` on create / update, an unknown tag slug on `setBlogPostTags`). Kept
 * apart from `BlogPostNotFoundError` so "the post is gone" and "fix the slug you sent" are
 * distinguishable by `__typename`.
 */

import { Field, ObjectType } from '@nestjs/graphql';

import {
  type BlogReferenceEntity,
  BlogReferenceEntityEnum,
} from './blog-reference-entity.enum.ts';

@ObjectType()
export class BlogReferenceNotFoundError {
  @Field(() => BlogReferenceEntityEnum, {
    description: `Which kind of record was not found.`,
  })
  entity!: BlogReferenceEntity;

  @Field(() => String, { description: `The slug that was not found.` })
  key!: string;

  @Field(() => String, { description: `Human-readable explanation.` })
  message!: string;
}
