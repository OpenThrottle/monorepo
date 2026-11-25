/**
 * @description Values of `agent_conversation_messages.role`.
 * @public
 */
export const AGENT_CONVERSATION_MESSAGE_ROLES = {
  assistant: 'assistant',
  system: 'system',
  tool: 'tool',
  user: 'user',
} as const;

export type AgentConversationMessageRolesKey =
  keyof typeof AGENT_CONVERSATION_MESSAGE_ROLES;
export type AgentConversationMessageRolesValue =
  (typeof AGENT_CONVERSATION_MESSAGE_ROLES)[AgentConversationMessageRolesKey];
