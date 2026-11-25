/**
 * @description GraphQL ObjectType for a user-defined agent conversation group.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentConversationGroupObject {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String)
  id!: string;

  @Field(() => String, {
    description: `Display name; trimmed, 1 to 80 characters`,
  })
  name!: string;

  @Field(() => Int, {
    description: `Position among the caller's groups, ascending`,
  })
  sortOrder!: number;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => String)
  userId!: string;
}
