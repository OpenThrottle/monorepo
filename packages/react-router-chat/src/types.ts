/** Who authored a chat message in the thread. */
export type ChatMessageRole = 'assistant' | 'system' | 'user';

/**
 * Rendered event kinds within an assistant turn. The backend wire stream emits
 * `tool_call` and `tool_result` separately; the client correlates them into a
 * single `tool` event, so the rendered kinds collapse those two into one.
 *
 * @publicApi
 */
export const ChatTurnEventKind = {
  session: 'session',
  text: 'text',
  thinking: 'thinking',
  tool: 'tool',
  usage: 'usage',
} as const;

/** Union of {@link ChatTurnEventKind} values. @publicApi */
export type ChatTurnEventKind =
  (typeof ChatTurnEventKind)[keyof typeof ChatTurnEventKind];

/**
 * Lifecycle of a single tool invocation. `running` once the tool_call is seen,
 * `succeeded` once its tool_result arrives, `failed` if the turn errors while
 * the call is still outstanding.
 *
 * @publicApi
 */
export const ChatToolStatus = {
  failed: 'failed',
  running: 'running',
  succeeded: 'succeeded',
} as const;

/** Union of {@link ChatToolStatus} values. @publicApi */
export type ChatToolStatus =
  (typeof ChatToolStatus)[keyof typeof ChatToolStatus];

/** Streamed assistant text segment (coalesced consecutive deltas). @publicApi */
export interface ChatTurnTextEvent {
  readonly kind: 'text';
  /** sortOrder of the first chunk in this segment; orders the event in the turn. */
  readonly sortOrder: number;
  readonly text: string;
}

/** Streamed reasoning segment (coalesced consecutive deltas). @publicApi */
export interface ChatTurnThinkingEvent {
  readonly kind: 'thinking';
  readonly sortOrder: number;
  readonly text: string;
}

/** A correlated tool_call/tool_result pair as one logical invocation. @publicApi */
export interface ChatTurnToolEvent {
  /** Raw tool arguments payload as JSON (from the tool_call), when present. */
  readonly argsJson: string | null;
  /** Correlation id linking the call to its result; null if the backend omits it. */
  readonly callId: string | null;
  /** Error text when the invocation failed. */
  readonly error: string | null;
  readonly kind: 'tool';
  /** Best-effort tool name (e.g. `read`, `edit`); `tool` when unknown. */
  readonly name: string;
  /** Raw tool result payload as JSON (from the tool_result), when present. */
  readonly resultJson: string | null;
  readonly sortOrder: number;
  readonly status: ChatToolStatus;
}

/** Terminal token-accounting / result summary for the turn. @publicApi */
export interface ChatTurnUsageEvent {
  readonly error: string | null;
  readonly kind: 'usage';
  /** Final assistant result text reported by the backend, when present. */
  readonly result: string | null;
  readonly sortOrder: number;
  /** Raw usage payload (token counts, etc.) as JSON, when present. */
  readonly usageJson: string | null;
}

/** Backend session handle confirmation (e.g. a resumed cursor chat id). @publicApi */
export interface ChatTurnSessionEvent {
  readonly kind: 'session';
  readonly sessionId: string | null;
  readonly sortOrder: number;
}

/**
 * One structured event within an assistant turn, ordered by `sortOrder`.
 * Discriminated on `kind`.
 *
 * @publicApi
 */
export type ChatTurnEvent =
  | ChatTurnSessionEvent
  | ChatTurnTextEvent
  | ChatTurnThinkingEvent
  | ChatTurnToolEvent
  | ChatTurnUsageEvent;

/** Single message in a modal chat thread. */
export interface ChatMessage {
  readonly body: string;
  readonly createdAt?: string;
  /**
   * Structured, ordered events for an assistant turn (thinking, tool calls,
   * text, usage). Optional and additive: when absent, renderers fall back to
   * the flat markdown `body`.
   */
  readonly events?: readonly ChatTurnEvent[];
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

/**
 * Voice-input state surfaced by the composer toolbar's mic control. `idle` =
 * not capturing; `recording` = mic live (pulsing affordance); `finalizing` =
 * the last transcript snapshot is settling after stop; `disabled` = voice
 * input unavailable. As-const object (no enum). Presentational — capture and
 * transcription logic live in the consumer.
 *
 * @publicApi
 */
export const ChatComposerMicState = {
  disabled: 'disabled',
  finalizing: 'finalizing',
  idle: 'idle',
  recording: 'recording',
} as const;

/** Union of {@link ChatComposerMicState} keys. @publicApi */
export type ChatComposerMicStateKey = keyof typeof ChatComposerMicState;

/** Union of {@link ChatComposerMicState} values. @publicApi */
export type ChatComposerMicStateValue = (typeof ChatComposerMicState)[ChatComposerMicStateKey]; // prettier-ignore
