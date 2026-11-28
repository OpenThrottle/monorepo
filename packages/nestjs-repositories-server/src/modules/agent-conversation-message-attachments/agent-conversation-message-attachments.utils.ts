import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { AgentConversationMessageAttachment } from './agent-conversation-message-attachment.entity.ts';
import type { AgentConversationMessageAttachmentsRepository } from './agent-conversation-message-attachments.repository.ts';
import type {
  AgentConversationMessageAttachmentsRepositoryMock,
  CreateAgentConversationMessageAttachmentInput,
} from './agent-conversation-message-attachments.types.ts';

/**
 * @description Builds an {@link AgentConversationMessageAttachmentsRepositoryMock} that starts as an
 * empty `agent_conversation_message_attachments` table (see `createBaseRepositoryMock`): lookups
 * find nothing, no sha is referenced, and deletes and links touch 0 rows. Provide it in place of
 * `AgentConversationMessageAttachmentsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createAgentConversationMessageAttachmentsRepositoryMock(): AgentConversationMessageAttachmentsRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      AgentConversationMessageAttachment,
      CreateAgentConversationMessageAttachmentInput
    >('agent_conversation_message_attachments'),
    deleteUnlinkedOlderThan: vi.fn<
      AgentConversationMessageAttachmentsRepository['deleteUnlinkedOlderThan']
    >(async () => {
      return 0;
    }),
    findOwnedById: vi.fn<
      AgentConversationMessageAttachmentsRepository['findOwnedById']
    >(async () => {
      return null;
    }),
    findOwnedByIds: vi.fn<
      AgentConversationMessageAttachmentsRepository['findOwnedByIds']
    >(async () => {
      return [];
    }),
    isShaReferenced: vi.fn<
      AgentConversationMessageAttachmentsRepository['isShaReferenced']
    >(async () => {
      return false;
    }),
    linkToMessage: vi.fn<
      AgentConversationMessageAttachmentsRepository['linkToMessage']
    >(async () => {
      return 0;
    }),
    listByMessageIds: vi.fn<
      AgentConversationMessageAttachmentsRepository['listByMessageIds']
    >(async () => {
      return [];
    }),
    unlinkFromMessage: vi.fn<
      AgentConversationMessageAttachmentsRepository['unlinkFromMessage']
    >(async () => {
      return 0;
    }),
  };
}
