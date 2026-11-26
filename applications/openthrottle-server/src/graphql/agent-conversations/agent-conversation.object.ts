/**
 * @description GraphQL ObjectTypes for persisted agent conversations and messages.
 */

import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { OffsetPageObject } from '@openthrottle/nestjs-graphql';

@ObjectType()
export class AgentConversationObject {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String, {
    description: `The user-defined conversation group this chat sits in, or null when ungrouped`,
    nullable: true,
  })
  groupId!: string | null;

  @Field(() => String)
  id!: string;

  @Field(() => String, {
    description: `JSON string of optional conversation metadata object`,
    nullable: true,
  })
  metadataJson!: string | null;

  @Field(() => String, {
    description: `Last router LLM model name when heuristic-only routing was not used`,
    nullable: true,
  })
  modelName!: string | null;

  @Field(() => String, {
    description: `Last router LLM provider when heuristic-only routing was not used`,
    nullable: true,
  })
  modelProvider!: string | null;

  @Field(() => Boolean, {
    description: `True when the chat is pinned to the top of the sidebar; never together with groupId`,
  })
  pinned!: boolean;

  @Field(() => String, {
    description: `Optional linked plan UUID`,
    nullable: true,
  })
  planId!: string | null;

  @Field(() => String, {
    description: `Optional linked project UUID`,
    nullable: true,
  })
  projectId!: string | null;

  @Field(() => String, {
    description: `Conversation lifecycle: active or archived (no hard delete in v1)`,
  })
  status!: string;

  @Field(() => String, {
    description: `Display title; auto-set from first user message when omitted on create`,
    nullable: true,
  })
  title!: string | null;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => String)
  userId!: string;
}

@ObjectType()
export class AgentConversationMessageObject {
  @Field(() => String)
  content!: string;

  @Field(() => String)
  conversationId!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String)
  id!: string;

  @Field(() => String, {
    description: `Message role: user, assistant, system, or tool`,
  })
  role!: string;

  @Field(() => Float, {
    description: `Router confidence on assistant rows`,
    nullable: true,
  })
  routingConfidence!: number | null;

  @Field(() => String, {
    description: `Router model on assistant rows`,
    nullable: true,
  })
  routingModel!: string | null;

  @Field(() => String, {
    description: `Router reason on assistant rows`,
    nullable: true,
  })
  routingReason!: string | null;

  @Field(() => String, {
    description: `Router tier on assistant rows`,
    nullable: true,
  })
  routingTier!: string | null;

  @Field(() => Int, {
    description: `Monotonic order within the conversation (user+assistant consecutive per turn)`,
  })
  sortOrder!: number;

  @Field(() => String, {
    description: `JSON string of tool metadata on assistant rows`,
    nullable: true,
  })
  toolMetadataJson!: string | null;
}

/** Result of listAgentConversations: conversations slice and total count. */
@ObjectType()
export class ListAgentConversationsResultObject extends OffsetPageObject {
  @Field(() => [AgentConversationObject])
  items!: AgentConversationObject[];
}

/** The turn a conversation is streaming right now, if any. */
@ObjectType()
export class AgentConversationActiveTurnObject {
  @Field(() => String, {
    description: `Assistant message id the running turn streams under; its row is written when the turn ends`,
  })
  assistantMessageId!: string;

  @Field(() => Date)
  startedAt!: Date;
}

/** Result of getAgentConversationMessages: messages slice and total count. */
@ObjectType()
export class ListAgentConversationMessagesResultObject extends OffsetPageObject {
  @Field(() => AgentConversationActiveTurnObject, {
    description: `The turn still streaming on this server, or null when none is running`,
    nullable: true,
  })
  activeTurn!: AgentConversationActiveTurnObject | null;

  @Field(() => [AgentConversationMessageObject])
  items!: AgentConversationMessageObject[];
}
