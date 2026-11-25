/**
 * @description Fishery factory for {@link AgentConversationGroup}. Use in tests to build mock
 * conversation groups.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { AgentConversationGroup } from './agent-conversation-group.entity.ts';

/**
 * Builds a group with a random name. Override any field via `.build({ ... })`.
 * @public
 */
export const agentConversationGroupsFactory = Factory.define<
  Omit<AgentConversationGroup, 'user'>
>(() => {
  const createdAt = faker.date.past();

  return {
    createdAt,
    id: faker.string.uuid(),
    name: faker.lorem.words(2),
    sortOrder: 1000,
    updatedAt: createdAt,
    userId: faker.string.uuid(),
  };
});
