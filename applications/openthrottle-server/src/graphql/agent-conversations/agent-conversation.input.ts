/**
 * @description GraphQL input types for agent conversation queries and mutations.
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { OffsetPaginationInput } from '@openthrottle/nestjs-graphql';

@InputType()
export class ListAgentConversationsInput extends OffsetPaginationInput {
  @Field(() => String, {
    defaultValue: 'active',
    description: `Filter by status: active or archived (default active)`,
    nullable: true,
  })
  status!: string | null;
}

@InputType()
export class GetAgentConversationMessagesInput extends OffsetPaginationInput {
  @Field(() => ID)
  conversationId!: string;
}

@InputType()
export class CreateAgentConversationInput {
  @Field(() => String, {
    description: `JSON string of optional metadata object`,
    nullable: true,
  })
  metadataJson!: string | null;

  @Field(() => ID, {
    description: `Optional linked plan UUID`,
    nullable: true,
  })
  planId!: string | null;

  @Field(() => ID, {
    description: `Optional linked project UUID`,
    nullable: true,
  })
  projectId!: string | null;

  @Field(() => String, {
    description: `Optional title; may be set on first persist turn instead`,
    nullable: true,
  })
  title!: string | null;
}

@InputType()
export class ArchiveAgentConversationInput {
  @Field(() => ID)
  conversationId!: string;
}

@InputType()
export class DeleteAgentConversationInput {
  @Field(() => ID)
  conversationId!: string;
}

@InputType()
export class UpdateAgentConversationTitleInput {
  @Field(() => ID)
  conversationId!: string;

  @Field(() => String)
  title!: string;
}
