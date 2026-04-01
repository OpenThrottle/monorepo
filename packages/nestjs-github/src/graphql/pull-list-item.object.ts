/**
 * @description GraphQL ObjectType for one PR in the list (GitHub pulls).
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PullListItemObject {
  @Field(() => String)
  author!: string;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  htmlUrl!: string;

  @Field(() => String, { nullable: true })
  mergedAt!: string | null;

  @Field(() => Int)
  number!: number;

  @Field(() => String)
  state!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  updatedAt!: string;
}
