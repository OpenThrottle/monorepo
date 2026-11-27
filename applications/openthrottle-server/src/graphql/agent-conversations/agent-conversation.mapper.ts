/**
 * @description Maps agent conversation entities to GraphQL object types.
 */

import type {
  AgentConversation,
  AgentConversationMessage,
  AgentConversationMessageAttachment,
} from '@openthrottle/nestjs-repositories-server';

import type {
  AgentConversationMessageAttachmentObject,
  AgentConversationMessageObject,
} from './agent-conversation.object.ts';
import type { AgentConversationObject } from './agent-conversation.object.ts';

const stringifyJsonField = (
  value: Record<string, unknown> | null,
): string | null => {
  return value == null ? null : JSON.stringify(value);
};

/**
 * @description Maps an {@link AgentConversation} entity to {@link AgentConversationObject}.
 */
export const toAgentConversationObject = (
  entity: AgentConversation,
): AgentConversationObject => {
  return {
    createdAt: entity.createdAt,
    groupId: entity.groupId,
    id: entity.id,
    metadataJson: stringifyJsonField(entity.metadata),
    modelName: entity.modelName,
    modelProvider: entity.modelProvider,
    pinned: entity.pinned,
    planId: entity.planId,
    projectId: entity.projectId,
    status: entity.status,
    title: entity.title,
    updatedAt: entity.updatedAt,
    userId: entity.userId,
  };
};

/**
 * @description Maps an attachment row to {@link AgentConversationMessageAttachmentObject}; the owner,
 * file hash and link stay server-side.
 */
export const toAgentConversationMessageAttachmentObject = (
  entity: AgentConversationMessageAttachment,
): AgentConversationMessageAttachmentObject => {
  return {
    byteSize: entity.byteSize,
    height: entity.height,
    id: entity.id,
    mimeType: entity.mimeType,
    originalName: entity.originalName,
    width: entity.width,
  };
};

/**
 * @description Groups attachment rows by the message they are linked to, keeping the order the
 * rows arrive in (oldest first). Rows with no message are dropped.
 */
export const groupAttachmentsByMessageId = (
  rows: readonly AgentConversationMessageAttachment[],
): Map<string, AgentConversationMessageAttachmentObject[]> => {
  const grouped = new Map<string, AgentConversationMessageAttachmentObject[]>();

  for (const row of rows) {
    if (row.messageId === null) {
      continue;
    }
    const group = grouped.get(row.messageId) ?? [];
    group.push(toAgentConversationMessageAttachmentObject(row));
    grouped.set(row.messageId, group);
  }

  return grouped;
};

/**
 * @description Maps an {@link AgentConversationMessage} entity to {@link AgentConversationMessageObject}.
 * `attachments` are the message's already-mapped images (see {@link groupAttachmentsByMessageId}).
 */
export const toAgentConversationMessageObject = (
  entity: AgentConversationMessage,
  attachments: readonly AgentConversationMessageAttachmentObject[] = [],
): AgentConversationMessageObject => {
  return {
    attachments: [...attachments],
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
  };
};

/**
 * @description Parses optional metadata JSON from GraphQL input.
 */
export const parseAgentConversationMetadataJson = (
  metadataJson: string | null | undefined,
): Record<string, unknown> | null => {
  if (metadataJson == null || metadataJson.trim() === '') {
    return null;
  }

  return JSON.parse(metadataJson);
};
