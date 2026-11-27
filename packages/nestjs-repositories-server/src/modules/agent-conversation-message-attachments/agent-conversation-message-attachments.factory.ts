/**
 * @description Fishery factory for {@link AgentConversationMessageAttachment}. Use in tests to
 * build mock chat image attachments.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { AgentConversationMessageAttachment } from './agent-conversation-message-attachment.entity.ts';
import { AGENT_CONVERSATION_MESSAGE_ATTACHMENT_MIME_TYPES } from './agent-conversation-message-attachments.constants.ts';

/**
 * Builds an unlinked PNG upload by default. Override any field via `.build({ messageId })`.
 * @public
 */
export const agentConversationMessageAttachmentsFactory =
  Factory.define<AgentConversationMessageAttachment>(() => ({
    byteSize: faker.number.int({ max: 5_000_000, min: 1 }),
    createdAt: faker.date.past(),
    height: faker.number.int({ max: 4000, min: 1 }),
    id: faker.string.uuid(),
    messageId: null,
    mimeType: AGENT_CONVERSATION_MESSAGE_ATTACHMENT_MIME_TYPES.png,
    originalName: faker.system.commonFileName('png'),
    sha256: faker.string.hexadecimal({
      casing: 'lower',
      length: 64,
      prefix: '',
    }),
    updatedAt: faker.date.past(),
    userId: faker.string.uuid(),
    width: faker.number.int({ max: 4000, min: 1 }),
  }));
