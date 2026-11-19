import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createAgentConversationMessagesRepositoryMock } from './agent-conversation-messages.utils.ts';

const userId = '11111111-1111-4111-8111-111111111111';
const conversationId = '22222222-2222-4222-8222-222222222222';

describe('createAgentConversationMessagesRepositoryMock', () => {
  it('starts with no conversations to append to or list', async () => {
    const repository = createAgentConversationMessagesRepositoryMock();

    await expect(
      repository.appendMessages(userId, conversationId, []),
    ).rejects.toThrow(NotFoundException);
    await expect(
      repository.listMessagesForConversation(userId, conversationId),
    ).rejects.toThrow(NotFoundException);
    await expect(
      repository.countMessagesForConversation(conversationId),
    ).resolves.toBe(0);
  });

  it('names the agent_conversation_messages table in inherited not-found errors', async () => {
    const repository = createAgentConversationMessagesRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(
      'agent_conversation_messages record with ID "a" not found',
    );
  });
});
