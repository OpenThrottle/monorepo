/**
 * @description Fishery factory for {@link AgentConversation}. Use in tests to build mock chat
 * conversations.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { AgentConversation } from './agent-conversation.entity.ts';
import { AGENT_CONVERSATION_STATUSES } from './agent-conversations.constants.ts';

/**
 * Builds a live, active conversation by default. Override any field via `.build({ ... })`.
 * @public
 */
export const agentConversationsFactory = Factory.define<AgentConversation>(
  () => ({
    createdAt: faker.date.past(),
    deletedAt: null,
    id: faker.string.uuid(),
    metadata: null,
    modelName: null,
    modelProvider: null,
    planId: null,
    projectId: null,
    status: AGENT_CONVERSATION_STATUSES.active,
    title: faker.lorem.sentence({ max: 6, min: 2 }),
    updatedAt: faker.date.recent(),
    userId: faker.string.uuid(),
  }),
);
