/**
 * @description Types for agent_conversation_groups (migration 207) shared by
 * AgentConversationGroupsRepository and its callers.
 */

import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { AgentConversationGroup } from './agent-conversation-group.entity.ts';
import type { AgentConversationGroupsRepository } from './agent-conversation-groups.repository.ts';

/**
 * @description What `AgentConversationGroupsRepository.create` takes.
 * @public
 */
export interface AgentConversationGroupCreateInput extends Omit<
  CreateModelInput<AgentConversationGroup>,
  'user'
> {}

/**
 * @description The result of {@link normalizeAgentConversationGroupName}.
 * @public
 */
export type AgentConversationGroupNameResult =
  | { readonly name: string; readonly ok: true }
  | { readonly message: string; readonly ok: false };

/**
 * @description An {@link AgentConversationGroupsRepository} mock: every inherited
 * `BaseRepository` method plus the group ones.
 * @public
 */
export interface AgentConversationGroupsRepositoryMock extends BaseRepositoryMock<
  AgentConversationGroup,
  AgentConversationGroupCreateInput
> {
  readonly createGroup: Mock<AgentConversationGroupsRepository['createGroup']>;
  readonly deleteGroup: Mock<AgentConversationGroupsRepository['deleteGroup']>;
  readonly listGroupsForUser: Mock<
    AgentConversationGroupsRepository['listGroupsForUser']
  >;
  readonly renameGroup: Mock<AgentConversationGroupsRepository['renameGroup']>;
  readonly reorderGroups: Mock<
    AgentConversationGroupsRepository['reorderGroups']
  >;
}
