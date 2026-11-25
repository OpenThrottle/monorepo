/**
 * @description Maps agent conversation group entities to GraphQL object types.
 */

import type { AgentConversationGroup } from '@openthrottle/nestjs-repositories-server';
import { normalizeAgentConversationGroupName } from '@openthrottle/nestjs-repositories-server';
import { GraphQLError } from 'graphql';

import type { AgentConversationGroupObject } from './agent-conversation-group.object.ts';

/**
 * @description Maps an {@link AgentConversationGroup} entity to {@link AgentConversationGroupObject}.
 */
export const toAgentConversationGroupObject = (
  entity: AgentConversationGroup,
): AgentConversationGroupObject => {
  return {
    createdAt: entity.createdAt,
    id: entity.id,
    name: entity.name,
    sortOrder: entity.sortOrder,
    updatedAt: entity.updatedAt,
    userId: entity.userId,
  };
};

/**
 * @description Trims and checks a group name from GraphQL input.
 * @throws GraphQLError with `extensions.code = 'BAD_USER_INPUT'` when it is empty or too long.
 */
export const parseAgentConversationGroupName = (rawName: string): string => {
  const result = normalizeAgentConversationGroupName(rawName);

  if (!result.ok) {
    throw new GraphQLError(result.message, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  return result.name;
};
