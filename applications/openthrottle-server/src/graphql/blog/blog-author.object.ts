/**
 * @description Public GraphQL shape of a blog author. Deliberately omits `id` and `userId`:
 * the link to the internal `users` row must never be reachable from an unauthenticated query.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BlogAuthorObject {
  @Field(() => String, { nullable: true })
  avatarUrl!: string | null;

  @Field(() => String, { nullable: true })
  bio!: string | null;

  @Field(() => String)
  displayName!: string;

  @Field(() => String)
  slug!: string;
}
