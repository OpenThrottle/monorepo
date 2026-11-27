/**
 * @description Values of `agent_conversation_message_attachments.mime_type`; the same set the
 * table's CHECK constraint allows.
 * @public
 */
export const AGENT_CONVERSATION_MESSAGE_ATTACHMENT_MIME_TYPES = {
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const;

export type AgentConversationMessageAttachmentMimeTypesKey =
  keyof typeof AGENT_CONVERSATION_MESSAGE_ATTACHMENT_MIME_TYPES;
export type AgentConversationMessageAttachmentMimeTypesValue =
  (typeof AGENT_CONVERSATION_MESSAGE_ATTACHMENT_MIME_TYPES)[AgentConversationMessageAttachmentMimeTypesKey];
