/**
 * @description Fishery factories for agent conversation entities.
 */

import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import type { AgentConversationMessage } from './agent-conversation-message.entity';
import {
  AGENT_CONVERSATION_MESSAGE_ROLES,
  AGENT_CONVERSATION_STATUSES,
} from './agent-conversation.constants';
import type { AgentConversation } from './agent-conversation.entity';

export type AgentConversationFactoryData = Pick<
  AgentConversation,
  | 'createdAt'
  | 'id'
  | 'metadata'
  | 'modelName'
  | 'modelProvider'
  | 'planId'
  | 'projectId'
  | 'status'
  | 'title'
  | 'updatedAt'
  | 'userId'
>;

export type AgentConversationMessageFactoryData = Pick<
  AgentConversationMessage,
  | 'content'
  | 'conversationId'
  | 'createdAt'
  | 'id'
  | 'role'
  | 'routingConfidence'
  | 'routingModel'
  | 'routingReason'
  | 'routingTier'
  | 'sortOrder'
  | 'toolMetadata'
>;

export const agentConversationsFactory =
  Factory.define<AgentConversationFactoryData>(() => ({
    createdAt: faker.date.past(),
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
  }));

export const agentConversationMessagesFactory =
  Factory.define<AgentConversationMessageFactoryData>(() => ({
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
