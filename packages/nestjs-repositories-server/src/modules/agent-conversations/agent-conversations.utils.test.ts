import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AGENT_CONVERSATION_STATUSES } from './agent-conversations.constants.ts';
import { createAgentConversationsRepositoryMock } from './agent-conversations.utils.ts';

const userId = '11111111-1111-4111-8111-111111111111';
const conversationId = '22222222-2222-4222-8222-222222222222';

describe('createAgentConversationsRepositoryMock', () => {
  it('starts as an empty table', async () => {
    const repository = createAgentConversationsRepositoryMock();

    await expect(repository.listConversationsForUser(userId)).resolves.toEqual(
      [],
    );
    await expect(
      repository.countConversationsForUser(
        userId,
        AGENT_CONVERSATION_STATUSES.active,
      ),
    ).resolves.toBe(0);
  });

  it('rejects every write on a conversation that does not exist', async () => {
    const repository = createAgentConversationsRepositoryMock();

    await expect(
      repository.getConversationForUser(userId, conversationId),
    ).rejects.toThrow(NotFoundException);
    await expect(
      repository.softDeleteConversation(userId, conversationId),
    ).rejects.toThrow(NotFoundException);
    await expect(
      repository.updateMetadata(conversationId, { a: 1 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('names the agent_conversations table in inherited not-found errors', async () => {
    const repository = createAgentConversationsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(
      'agent_conversations record with ID "a" not found',
    );
  });
});
