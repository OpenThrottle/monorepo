/**
 * @description Maps agent conversation entities to GraphQL object types.
 */

import type {
  AgentConversation,
  AgentConversationMessage,
} from '@openthrottle/nestjs-repositories';
import type { AgentConversationMessageObject } from './agent-conversation.object';
import type { AgentConversationObject } from './agent-conversation.object';

const stringifyJsonField = (
  value: Record<string, unknown> | null,
): string | null => (value == null ? null : JSON.stringify(value));

/**
 * @description Maps an {@link AgentConversation} entity to {@link AgentConversationObject}.
 */
export const toAgentConversationObject = (
  entity: AgentConversation,
): AgentConversationObject => ({
  createdAt: entity.createdAt,
  id: entity.id,
  metadataJson: stringifyJsonField(entity.metadata),
  modelName: entity.modelName,
  modelProvider: entity.modelProvider,
  planId: entity.planId,
  projectId: entity.projectId,
  status: entity.status,
  title: entity.title,
  updatedAt: entity.updatedAt,
  userId: entity.userId,
});

/**
 * @description Maps an {@link AgentConversationMessage} entity to {@link AgentConversationMessageObject}.
 */
export const toAgentConversationMessageObject = (
  entity: AgentConversationMessage,
): AgentConversationMessageObject => ({
  content: entity.content,
  conversationId: entity.conversationId,
  createdAt: entity.createdAt,
  id: entity.id,
  role: entity.role,
  routingConfidence: entity.routingConfidence,
  routingModel: entity.routingModel,
  routingReason: entity.routingReason,
  routingTier: entity.routingTier,
  sortOrder: entity.sortOrder,
  toolMetadataJson: stringifyJsonField(entity.toolMetadata),
});

/**
 * @description Parses optional metadata JSON from GraphQL input.
 */
export const parseAgentConversationMetadataJson = (
  metadataJson: string | null | undefined,
): Record<string, unknown> | null => {
  if (metadataJson == null || metadataJson.trim() === '') {
    return null;
  }

  return JSON.parse(metadataJson) as Record<string, unknown>;
};
