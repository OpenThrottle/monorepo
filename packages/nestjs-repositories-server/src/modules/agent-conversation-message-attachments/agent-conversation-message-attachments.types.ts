/**
 * @description Types for agent_conversation_message_attachments (migration 209) shared by
 * AgentConversationMessageAttachmentsRepository and its callers.
 */

import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { AgentConversationMessageAttachment } from './agent-conversation-message-attachment.entity.ts';
import type { AgentConversationMessageAttachmentsRepository } from './agent-conversation-message-attachments.repository.ts';

/**
 * @description What an upload records. There is no `messageId`: a row starts unlinked and
 * `linkToMessage` sets it when the turn is sent.
 * @public
 */
export type CreateAgentConversationMessageAttachmentInput = Omit<
  CreateModelInput<AgentConversationMessageAttachment>,
  'message' | 'messageId' | 'user'
>;

/**
 * @description An {@link AgentConversationMessageAttachmentsRepository} mock: every inherited
 * `BaseRepository` method plus the attachment ones.
 * @public
 */
export interface AgentConversationMessageAttachmentsRepositoryMock extends BaseRepositoryMock<
  AgentConversationMessageAttachment,
  CreateAgentConversationMessageAttachmentInput
> {
  readonly deleteUnlinkedOlderThan: Mock<
    AgentConversationMessageAttachmentsRepository['deleteUnlinkedOlderThan']
  >;
  readonly findOwnedById: Mock<
    AgentConversationMessageAttachmentsRepository['findOwnedById']
  >;
  readonly findOwnedByIds: Mock<
    AgentConversationMessageAttachmentsRepository['findOwnedByIds']
  >;
  readonly isShaReferenced: Mock<
    AgentConversationMessageAttachmentsRepository['isShaReferenced']
  >;
  readonly linkToMessage: Mock<
    AgentConversationMessageAttachmentsRepository['linkToMessage']
  >;
  readonly listByMessageIds: Mock<
    AgentConversationMessageAttachmentsRepository['listByMessageIds']
  >;
  readonly unlinkFromMessage: Mock<
    AgentConversationMessageAttachmentsRepository['unlinkFromMessage']
  >;
}
