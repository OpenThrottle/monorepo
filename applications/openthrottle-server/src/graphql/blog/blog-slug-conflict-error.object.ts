/**
 * @description Typed error result returned (as a member of {@link BlogPostMutationResult}) when
 * a create or update would give a post a slug another post already uses. An expected outcome of
 * editing, so it is data the caller branches on via `__typename` rather than a GraphQL error.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BlogSlugConflictError {
  @Field(() => String, { description: `Human-readable explanation.` })
  message!: string;

  @Field(() => String, { description: `The slug that is already taken.` })
  slug!: string;
}

/** @description Type guard distinguishing the error member of {@link BlogPostMutationResult}. */
export const isBlogSlugConflictError = (
  value: unknown,
): value is BlogSlugConflictError => value instanceof BlogSlugConflictError;
