/**
 * @description GraphQL input types for agent conversation group mutations.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class CreateAgentConversationGroupInput {
  @Field(() => String, {
    description: `Group name; trimmed, 1 to 80 characters`,
  })
  name!: string;
}

@InputType()
export class RenameAgentConversationGroupInput {
  @Field(() => ID)
  groupId!: string;

  @Field(() => String, {
    description: `Group name; trimmed, 1 to 80 characters`,
  })
  name!: string;
}

@InputType()
export class DeleteAgentConversationGroupInput {
  @Field(() => ID)
  groupId!: string;
}

@InputType()
export class ReorderAgentConversationGroupInput {
  @Field(() => [ID], {
    description: `Every one of the caller's group ids exactly once, in the new order`,
  })
  groupIds!: string[];
}
