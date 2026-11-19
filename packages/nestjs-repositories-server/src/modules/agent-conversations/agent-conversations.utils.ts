import { NotFoundException } from '@nestjs/common';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { AgentConversation } from './agent-conversation.entity.ts';
import type { AgentConversationsRepository } from './agent-conversations.repository.ts';
import type { AgentConversationsRepositoryMock } from './agent-conversations.types.ts';

/**
 * @description Builds an {@link AgentConversationsRepositoryMock} that starts as an empty
 * `agent_conversations` table (see `createBaseRepositoryMock`): lists are empty, counts are 0, and
 * every method that needs an existing conversation rejects with `NotFoundException`, as the real
 * repository does. `createConversation` rejects too; stub it per test. Provide it in place of
 * `AgentConversationsRepository`. Test-only: imports `vitest`.
 * @public
 */
export function createAgentConversationsRepositoryMock(): AgentConversationsRepositoryMock {
  const notFound = async (): Promise<never> => {
    throw new NotFoundException('Agent conversation not found');
  };

  return {
    ...createBaseRepositoryMock<
      AgentConversation,
      CreateModelInput<AgentConversation>
    >('agent_conversations'),
    archiveConversation:
      vi.fn<AgentConversationsRepository['archiveConversation']>(notFound),
    countConversationsForUser: vi.fn(async () => {
      return 0;
    }),
    createConversation:
      vi.fn<AgentConversationsRepository['createConversation']>(notFound),
    getConversationForUser:
      vi.fn<AgentConversationsRepository['getConversationForUser']>(notFound),
    listConversationsForUser: vi.fn(async () => {
      return [];
    }),
    softDeleteConversation:
      vi.fn<AgentConversationsRepository['softDeleteConversation']>(notFound),
    updateConversationTitle:
      vi.fn<AgentConversationsRepository['updateConversationTitle']>(notFound),
    updateMetadata:
      vi.fn<AgentConversationsRepository['updateMetadata']>(notFound),
    updateModelSnapshot:
      vi.fn<AgentConversationsRepository['updateModelSnapshot']>(notFound),
  };
}
