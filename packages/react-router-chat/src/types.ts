/** Who authored a chat message in the thread. */
export type ChatMessageRole = 'assistant' | 'system' | 'user';

/** Single message in a modal chat thread. */
export interface ChatMessage {
  readonly body: string;
  readonly createdAt?: string;
  readonly id: string;
  readonly role: ChatMessageRole;
}

/** JSON shape returned by a root `send-agent-message` action (mirrors `agentsRunChatTurn`). */
export interface ChatTurnResult {
  readonly assistantText: string | null;
  readonly errorMessage: string | null;
  readonly toolMetadataJson: string | null;
}
