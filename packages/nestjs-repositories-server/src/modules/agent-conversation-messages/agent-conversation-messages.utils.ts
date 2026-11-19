import { NotFoundException } from '@nestjs/common';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { AgentConversationMessage } from './agent-conversation-message.entity.ts';
import type { AgentConversationMessagesRepository } from './agent-conversation-messages.repository.ts';
import type { AgentConversationMessagesRepositoryMock } from './agent-conversation-messages.types.ts';

/**
 * @description Builds an {@link AgentConversationMessagesRepositoryMock} that starts as an empty
 * `agent_conversation_messages` table with no conversations (see `createBaseRepositoryMock`):
 * appends and lists reject with `NotFoundException`, as the real repository does for a missing
 * conversation, and counts are 0. Provide it in place of `AgentConversationMessagesRepository`
 * and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createAgentConversationMessagesRepositoryMock(): AgentConversationMessagesRepositoryMock {
  const notFound = async (): Promise<never> => {
    throw new NotFoundException('Agent conversation not found');
  };

  return {
    ...createBaseRepositoryMock<
      AgentConversationMessage,
      CreateModelInput<AgentConversationMessage>
    >('agent_conversation_messages'),
    appendMessages:
      vi.fn<AgentConversationMessagesRepository['appendMessages']>(notFound),
    appendTurn:
      vi.fn<AgentConversationMessagesRepository['appendTurn']>(notFound),
    countMessagesForConversation: vi.fn(async () => {
      return 0;
    }),
    listMessagesForConversation:
      vi.fn<AgentConversationMessagesRepository['listMessagesForConversation']>(
        notFound,
      ),
  };
}
