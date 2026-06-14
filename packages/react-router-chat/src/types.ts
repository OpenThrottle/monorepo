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

/**
 * A selectable model in the composer toolbar's model control. Presentational
 * only — consumers supply the list; the package hardcodes no models.
 *
 * @publicApi
 */
export interface ChatModelOption {
  readonly description?: string;
  readonly id: string;
  readonly label: string;
}

/**
 * A selectable agent/persona in the composer toolbar's persona control. Shaped
 * close to the OpenThrottle personas registry so consumer wiring stays cheap.
 *
 * @publicApi
 */
export interface ChatPersonaOption {
  readonly description?: string;
  readonly id: string;
  readonly label: string;
}

/**
 * A context source surfaced by the composer toolbar's attach control (a file,
 * project, etc.). Presentational — the package never resolves or uploads it.
 *
 * @publicApi
 */
export interface ChatContextSource {
  readonly description?: string;
  readonly id: string;
  readonly label: string;
}

/**
 * Agent interaction mode for the composer. `plan` = describe intent to get a
 * decomposed plan; `build` = agentic execution. As-const object (no enum).
 *
 * @publicApi
 */
export const ChatComposerMode = {
  build: 'build',
  plan: 'plan',
} as const;

/** Union of {@link ChatComposerMode} values. */
export type ChatComposerMode =
  (typeof ChatComposerMode)[keyof typeof ChatComposerMode];
