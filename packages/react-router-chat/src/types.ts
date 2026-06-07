/** Who authored a chat message in the thread. */
export type ChatMessageRole = 'assistant' | 'system' | 'user';

/** Single message in a modal chat thread. */
export interface ChatMessage {
  readonly body: string;
  readonly createdAt?: string;
  readonly footer?: string | null;
  readonly id: string;
  readonly role: ChatMessageRole;
}

/** JSON shape returned by a root `load-agent-conversation-messages` action. */
export interface LoadAgentConversationMessagesResult {
  readonly conversationId: string | null;
  readonly errorMessage: string | null;
  readonly messages: readonly ChatMessage[];
}

/** JSON shape returned by a root `send-agent-message` action (mirrors `agentsRunChatTurn`). */
export interface ChatTurnResult {
  readonly assistantText: string | null;
  readonly conversationId: string | null;
  readonly errorMessage: string | null;
  readonly mcpTool: string | null;
  readonly readOnlyAgentsChat: boolean;
  readonly routingConfidence: number | null;
  readonly routingReason: string | null;
  readonly structuredPayloadJson: string | null;
  readonly toolMetadataJson: string | null;
}
