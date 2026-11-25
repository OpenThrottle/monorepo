import { NotFoundException } from '@nestjs/common';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { AgentConversationGroup } from './agent-conversation-group.entity.ts';
import type { AgentConversationGroupsRepository } from './agent-conversation-groups.repository.ts';
import type {
  AgentConversationGroupCreateInput,
  AgentConversationGroupsRepositoryMock,
} from './agent-conversation-groups.types.ts';

/**
 * @description Builds an {@link AgentConversationGroupsRepositoryMock} that starts as an empty
 * `agent_conversation_groups` table: lists are empty, and every method that needs an existing
 * group rejects with `NotFoundException`, as the real repository does. `createGroup` rejects
 * too; stub it per test. Provide it in place of `AgentConversationGroupsRepository`. Test-only:
 * imports `vitest`.
 * @public
 */
export function createAgentConversationGroupsRepositoryMock(): AgentConversationGroupsRepositoryMock {
  const notFound = async (): Promise<never> => {
    throw new NotFoundException('Agent conversation group not found');
  };

  return {
    ...createBaseRepositoryMock<
      AgentConversationGroup,
      AgentConversationGroupCreateInput
    >('agent_conversation_groups'),
    createGroup:
      vi.fn<AgentConversationGroupsRepository['createGroup']>(notFound),
    deleteGroup:
      vi.fn<AgentConversationGroupsRepository['deleteGroup']>(notFound),
    listGroupsForUser: vi.fn(async () => {
      return [];
    }),
    renameGroup:
      vi.fn<AgentConversationGroupsRepository['renameGroup']>(notFound),
    reorderGroups: vi.fn(async () => {
      return [];
    }),
  };
}
