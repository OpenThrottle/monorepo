/**
 * @description Fishery factory for {@link AgentConversationMessage}. Use in tests to build mock
 * chat messages.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { AgentConversationMessage } from './agent-conversation-message.entity.ts';
import { AGENT_CONVERSATION_MESSAGE_ROLES } from './agent-conversation-messages.constants.ts';

/**
 * Builds a user message by default. Override any field via `.build({ role: 'assistant' })`.
 * @public
 */
export const agentConversationMessagesFactory =
  Factory.define<AgentConversationMessage>(() => ({
    content: faker.lorem.paragraph(),
    conversationId: faker.string.uuid(),
    createdAt: faker.date.past(),
    id: faker.string.uuid(),
    role: AGENT_CONVERSATION_MESSAGE_ROLES.user,
    routingConfidence: null,
    routingModel: null,
    routingReason: null,
    routingTier: null,
    sortOrder: faker.number.int({ max: 20, min: 1 }),
    toolMetadata: null,
  }));
