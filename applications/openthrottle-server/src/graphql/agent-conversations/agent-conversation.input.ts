/**
 * @description GraphQL input types for agent conversation queries and mutations.
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class ListAgentConversationsInput {
  @Field(() => Int, {
    defaultValue: 20,
    description: `Page size (default 20, max 100)`,
    nullable: true,
  })
  limit!: number | null;

  @Field(() => Int, {
    defaultValue: 0,
    description: `Offset for pagination`,
    nullable: true,
  })
  offset!: number | null;

  @Field(() => String, {
    defaultValue: 'active',
    description: `Filter by status: active or archived (default active)`,
    nullable: true,
  })
  status!: string | null;
}

@InputType()
export class GetAgentConversationMessagesInput {
  @Field(() => ID)
  conversationId!: string;

  @Field(() => Int, {
    defaultValue: 100,
    description: `Page size (default 100, max 500)`,
    nullable: true,
  })
  limit!: number | null;

  @Field(() => Int, {
    defaultValue: 0,
    description: `Offset for pagination`,
    nullable: true,
  })
  offset!: number | null;
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
export class UpdateAgentConversationTitleInput {
  @Field(() => ID)
  conversationId!: string;

  @Field(() => String)
  title!: string;
}
