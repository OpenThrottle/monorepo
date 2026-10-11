/**
 * @description Public GraphQL shape of a blog tag.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BlogTagObject {
  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;
}
