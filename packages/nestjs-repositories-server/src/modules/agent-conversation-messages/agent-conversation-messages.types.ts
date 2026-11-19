/**
 * @description Types for agent_conversation_messages (migrations 051, 180) shared by
 * AgentConversationMessagesRepository and its callers.
 */

import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { AgentConversationMessage } from './agent-conversation-message.entity.ts';
import type { AGENT_CONVERSATION_MESSAGE_ROLES } from './agent-conversation-messages.constants.ts';
import type { AgentConversationMessagesRepository } from './agent-conversation-messages.repository.ts';

/** @public */
export type AgentConversationMessageRole =
  (typeof AGENT_CONVERSATION_MESSAGE_ROLES)[keyof typeof AGENT_CONVERSATION_MESSAGE_ROLES];

/** @public */
export interface AppendAgentConversationTurnParams {
  readonly assistantContent: string;
  readonly modelName?: string | null;
  readonly modelProvider?: string | null;
  readonly routingConfidence?: number | null;
  readonly routingModel?: string | null;
  readonly routingReason?: string | null;
  readonly routingTier?: string | null;
  readonly toolMetadata?: Record<string, unknown> | null;
  readonly userContent: string;
}

/** @public */
export interface AppendAgentConversationMessageParams {
  readonly content: string;
  /** Optional explicit id (e.g. a pre-allocated assistant message id from a streaming turn). */
  readonly id?: string;
  readonly role: AgentConversationMessageRole;
  readonly routingConfidence?: number | null;
  readonly routingModel?: string | null;
  readonly routingReason?: string | null;
  readonly routingTier?: string | null;
  readonly toolMetadata?: Record<string, unknown> | null;
}

/** @public */
export interface ListAgentConversationMessagesOptions {
  readonly limit?: number;
  readonly offset?: number;
}

/** @public */
export interface AppendTurnResult {
  readonly assistantMessage: AgentConversationMessage;
  readonly userMessage: AgentConversationMessage;
}

/**
 * @description An {@link AgentConversationMessagesRepository} mock: every inherited
 * `BaseRepository` method plus the message ones.
 * @public
 */
export interface AgentConversationMessagesRepositoryMock extends BaseRepositoryMock<
  AgentConversationMessage,
  CreateModelInput<AgentConversationMessage>
> {
  readonly appendMessages: Mock<
    AgentConversationMessagesRepository['appendMessages']
  >;
  readonly appendTurn: Mock<AgentConversationMessagesRepository['appendTurn']>;
  readonly countMessagesForConversation: Mock<
    AgentConversationMessagesRepository['countMessagesForConversation']
  >;
  readonly listMessagesForConversation: Mock<
    AgentConversationMessagesRepository['listMessagesForConversation']
  >;
}
