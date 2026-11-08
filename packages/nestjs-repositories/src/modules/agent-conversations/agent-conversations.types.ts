import type { AgentConversationMessage } from './agent-conversation-message.entity.ts';
import type {
  AGENT_CONVERSATION_MESSAGE_ROLES,
  AGENT_CONVERSATION_STATUSES,
} from './agent-conversations.constants.ts';

export type AgentConversationStatus =
  (typeof AGENT_CONVERSATION_STATUSES)[keyof typeof AGENT_CONVERSATION_STATUSES];

export type AgentConversationMessageRole =
  (typeof AGENT_CONVERSATION_MESSAGE_ROLES)[keyof typeof AGENT_CONVERSATION_MESSAGE_ROLES];
export interface AppendTurnResult {
  readonly assistantMessage: AgentConversationMessage;
  readonly userMessage: AgentConversationMessage;
}
