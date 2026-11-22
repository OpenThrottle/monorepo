/**
 * @description Types for agent_conversations (migrations 051, 081, 180) shared by
 * AgentConversationsRepository and its callers.
 */

import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { AgentConversation } from './agent-conversation.entity.ts';
import type { AGENT_CONVERSATION_STATUSES } from './agent-conversations.constants.ts';
import type { AgentConversationsRepository } from './agent-conversations.repository.ts';

/** @public */
export type AgentConversationStatus =
  (typeof AGENT_CONVERSATION_STATUSES)[keyof typeof AGENT_CONVERSATION_STATUSES];

/** @public */
export interface CreateAgentConversationParams {
  readonly metadata?: Record<string, unknown> | null;
  readonly planId?: string | null;
  readonly projectId?: string | null;
  readonly title?: string | null;
}

/** @public */
export interface ListAgentConversationsOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly status?: AgentConversationStatus;
}

/** @public */
export interface UpdateAgentConversationModelSnapshotParams {
  readonly modelName: string | null;
  readonly modelProvider: string | null;
}

/**
 * @description An {@link AgentConversationsRepository} mock: every inherited `BaseRepository`
 * method plus the conversation ones.
 * @public
 */
export interface AgentConversationsRepositoryMock extends BaseRepositoryMock<
  AgentConversation,
  CreateModelInput<AgentConversation>
> {
  readonly archiveConversation: Mock<
    AgentConversationsRepository['archiveConversation']
  >;
  readonly countConversationsForUser: Mock<
    AgentConversationsRepository['countConversationsForUser']
  >;
  readonly createConversation: Mock<
    AgentConversationsRepository['createConversation']
  >;
  readonly getConversationForUser: Mock<
    AgentConversationsRepository['getConversationForUser']
  >;
  readonly listConversationsForUser: Mock<
    AgentConversationsRepository['listConversationsForUser']
  >;
  readonly restoreConversation: Mock<
    AgentConversationsRepository['restoreConversation']
  >;
  readonly softDeleteConversation: Mock<
    AgentConversationsRepository['softDeleteConversation']
  >;
  readonly updateConversationTitle: Mock<
    AgentConversationsRepository['updateConversationTitle']
  >;
  readonly updateMetadata: Mock<AgentConversationsRepository['updateMetadata']>;
  readonly updateModelSnapshot: Mock<
    AgentConversationsRepository['updateModelSnapshot']
  >;
}
