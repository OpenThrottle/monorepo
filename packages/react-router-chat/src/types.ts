import type { NormalizedTokenUsage } from '@openthrottle/agentic-token-usage';
import type * as React from 'react';

/** Who authored a chat message in the thread. */
export type ChatMessageRole = 'assistant' | 'system' | 'user';

/**
 * Rendered event kinds within an assistant turn. The backend wire stream emits
 * `tool_call` and `tool_result` separately; the client correlates them into a
 * single `tool` event, so the rendered kinds collapse those two into one.
 *
 * @public
 */
export const ChatTurnEventKind = {
  session: 'session',
  text: 'text',
  thinking: 'thinking',
  tool: 'tool',
  usage: 'usage',
} as const;

/** Union of {@link ChatTurnEventKind} values. @public */
export type ChatTurnEventKind =
  (typeof ChatTurnEventKind)[keyof typeof ChatTurnEventKind];

/**
 * Lifecycle of a single tool invocation. `running` once the tool_call is seen,
 * `succeeded` once its tool_result arrives, `failed` if the turn errors while
 * the call is still outstanding.
 *
 * @public
 */
export const ChatToolStatus = {
  failed: 'failed',
  running: 'running',
  succeeded: 'succeeded',
} as const;

/** Union of {@link ChatToolStatus} values. @public */
export type ChatToolStatus =
  (typeof ChatToolStatus)[keyof typeof ChatToolStatus];

/** Streamed assistant text segment (coalesced consecutive deltas). @public */
export interface ChatTurnTextEvent {
  readonly kind: 'text';
  /** sortOrder of the first chunk in this segment; orders the event in the turn. */
  readonly sortOrder: number;
  readonly text: string;
}

/** Streamed reasoning segment (coalesced consecutive deltas). @public */
export interface ChatTurnThinkingEvent {
  readonly kind: 'thinking';
  readonly sortOrder: number;
  readonly text: string;
}

/** A correlated tool_call/tool_result pair as one logical invocation. @public */
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

/**
 * Normalized, best-effort token accounting for a single turn (or a cumulative
 * session total). Canonical shape now lives in the isomorphic
 * `@openthrottle/agentic-token-usage` leaf as {@link NormalizedTokenUsage};
 * `ChatTokenUsage` is a backward-compatible alias so existing chat import sites
 * keep working. Produced by `normalizeUsage` from a backend's raw metadata and
 * accumulated by `sumUsage` (both re-exported from `./usage`).
 *
 * @public
 */
export type ChatTokenUsage = NormalizedTokenUsage;

/** Terminal token-accounting / result summary for the turn. @public */
export interface ChatTurnUsageEvent {
  readonly error: string | null;
  readonly kind: 'usage';
  /** Final assistant result text reported by the backend, when present. */
  readonly result: string | null;
  readonly sortOrder: number;
  /**
   * Normalized, typed usage for this turn, when any counts were reported.
   * Derived from {@link usageJson}/the raw metadata via {@link normalizeUsage};
   * `undefined` when the backend reported nothing.
   */
  readonly usage?: ChatTokenUsage;
  /** Raw usage payload (token counts, etc.) as JSON, when present. */
  readonly usageJson: string | null;
}

/** Backend session handle confirmation (e.g. a resumed cursor chat id). @public */
export interface ChatTurnSessionEvent {
  readonly kind: 'session';
  readonly sessionId: string | null;
  readonly sortOrder: number;
}

/**
 * One structured event within an assistant turn, ordered by `sortOrder`.
 * Discriminated on `kind`.
 *
 * @public
 */
export type ChatTurnEvent =
  | ChatTurnSessionEvent
  | ChatTurnTextEvent
  | ChatTurnThinkingEvent
  | ChatTurnToolEvent
  | ChatTurnUsageEvent;

/**
 * Coarse phase of an in-flight assistant turn, used to give the running
 * indicator something more specific than a generic "Working…". Ordered roughly
 * by how far the turn has progressed: `connecting` (request in flight, nothing
 * back yet) → `waiting` (connected, awaiting the model's first token) →
 * `thinking` (reasoning is streaming) / `runningTool` (a tool call is
 * outstanding). `stillWorking` is the elapsed-escalation fallback shown when a
 * generic wait drags on. As-const object (no enum, repo rule).
 *
 * @public
 */
export const ChatRunPhase = {
  connecting: 'connecting',
  runningTool: 'running-tool',
  stillWorking: 'still-working',
  thinking: 'thinking',
  waiting: 'waiting',
} as const;

/** Union of {@link ChatRunPhase} values. @public */
export type ChatRunPhase = (typeof ChatRunPhase)[keyof typeof ChatRunPhase];

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
  /**
   * True while an assistant turn has been started but no content has streamed
   * yet (the request is in flight). Renders a subtle running indicator in place
   * of an empty body, so a slow backend (e.g. an agent CLI that emits its whole
   * turn in one end-of-turn burst) does not read as a blank "(No content)" reply.
   * Ignored once `events` or a non-empty `body` are present.
   */
  readonly pending?: boolean;
  /**
   * Coarse phase for a {@link pending} assistant turn, driving the running
   * indicator's copy (e.g. `connecting` → `waiting` → `still-working`). Optional
   * and additive: when absent the indicator falls back to its `waiting` default.
   * Only meaningful while `pending` is true.
   */
  readonly phase?: ChatRunPhase;
  /**
   * Subject for {@link phase} (a model or tool name) composed into the indicator
   * label, when known. Ignored unless `phase` is set.
   */
  readonly phaseDetail?: string | null;
  readonly role: ChatMessageRole;
}

/** JSON shape returned by a root `load-agent-conversation-messages` action. */
export interface LoadAgentConversationMessagesResult {
  readonly conversationId: string | null;
  readonly errorMessage: string | null;
  readonly messages: readonly ChatMessage[];
}

/**
 * One conversation row for the conversations sidebar/switcher list. Data-only,
 * shared by the loader/action intents that fetch it and the presentational
 * {@link ChatConversationSidebar} that renders it.
 */
export interface AgentConversationListItem {
  readonly id: string;
  readonly status: string;
  readonly title: string | null;
  readonly updatedAt: string;
}

/** JSON shape returned by a root `list-agent-conversations` action. */
export interface ListAgentConversationsResult {
  readonly conversations: readonly AgentConversationListItem[];
  readonly errorMessage: string | null;
  readonly totalCount: number;
}

/**
 * JSON shape returned by the root `rename-agent-conversation` and
 * `delete-agent-conversation` actions. `conversation` is the updated row on
 * success (null on failure); `errorMessage` is set only on failure.
 */
export interface MutateAgentConversationResult {
  readonly conversation: AgentConversationListItem | null;
  readonly errorMessage: string | null;
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
 * The original flat `{ id, label, description }` shape keeps working (the flat
 * `Select` in {@link ChatComposerToolbar} still renders it). The additive
 * `groupId` / `subLabel` / `favorite` / `shortcut` fields drive the grouped,
 * searchable {@link ChatModelPicker} — supply `groupId` (matching a
 * {@link ChatModelGroup} `id`) to place a model under a provider/CLI rail.
 *
 * @public
 */
export interface ChatModelOption {
  readonly description?: string;
  /**
   * True when the model is pinned to the picker's "Favorites" group. The
   * package renders the flag; toggling is a consumer concern
   * (`ChatModelPicker`'s `onToggleFavorite`).
   */
  readonly favorite?: boolean;
  /**
   * Id of the {@link ChatModelGroup} (provider/CLI) this model belongs to in
   * the grouped picker. Omit for the flat control or an ungrouped model.
   */
  readonly groupId?: string;
  readonly id: string;
  readonly label: string;
  /**
   * Optional keyboard shortcut hint shown on the model's row (e.g. `⌘1`). The
   * package only displays it; wiring the accelerator is a consumer concern.
   */
  readonly shortcut?: string;
  /**
   * Short muted sub-label rendered under {@link label} (e.g. `Codex`), used to
   * disambiguate same-named models across CLIs.
   */
  readonly subLabel?: string;
}

/**
 * A provider/CLI grouping for the grouped model picker (e.g. Claude Code,
 * Codex, Cursor, a local OpenAI-compatible endpoint). Presentational — the
 * consumer supplies the groups and their icons; the package hardcodes none.
 *
 * @public
 */
export interface ChatModelGroup {
  /** Optional leading glyph/icon rendered in the picker's left rail. */
  readonly icon?: React.ReactNode;
  readonly id: string;
  readonly label: string;
}

/**
 * A selectable repository/checkout for the composer's checkout selector (the
 * screenshots' "Current checkout" affordance). Presentational — the consumer
 * supplies the list from its own repository registry; the package resolves
 * nothing.
 *
 * @public
 */
export interface ChatCheckoutOption {
  /** Current branch shown alongside the checkout (e.g. `main`), when known. */
  readonly branch?: string;
  readonly id: string;
  readonly label: string;
}

/**
 * Reasoning-effort levels a backend may expose in the composer's
 * reasoning/tier control. As-const object (no enum, repo rule). Which levels
 * are actually selectable is gated per-backend by
 * {@link ChatBackendCapabilities.reasoningLevels}.
 *
 * @public
 */
export const ChatReasoningLevel = {
  extraHigh: 'extraHigh',
  high: 'high',
  low: 'low',
  max: 'max',
  medium: 'medium',
  ultra: 'ultra',
} as const;

/** Union of {@link ChatReasoningLevel} values. @public */
export type ChatReasoningLevel =
  (typeof ChatReasoningLevel)[keyof typeof ChatReasoningLevel];

/**
 * Service tier a backend may expose in the reasoning/tier control. `standard`
 * = default queue; `fast` = priority/low-latency. As-const object (no enum).
 * Gated per-backend by {@link ChatBackendCapabilities.serviceTiers}.
 *
 * @public
 */
export const ChatServiceTier = {
  fast: 'fast',
  standard: 'standard',
} as const;

/** Union of {@link ChatServiceTier} values. @public */
export type ChatServiceTier =
  (typeof ChatServiceTier)[keyof typeof ChatServiceTier];

/**
 * Permission posture for an agent backend. `supervised` asks before commands
 * and file changes; `autoAcceptEdits` auto-approves edits but asks before
 * other actions; `fullAccess` runs commands and edits without prompts.
 * As-const object (no enum). Gated per-backend by
 * {@link ChatBackendCapabilities.permissionModes}.
 *
 * @public
 */
export const ChatPermissionMode = {
  autoAcceptEdits: 'autoAcceptEdits',
  fullAccess: 'fullAccess',
  supervised: 'supervised',
} as const;

/** Union of {@link ChatPermissionMode} values. @public */
export type ChatPermissionMode =
  (typeof ChatPermissionMode)[keyof typeof ChatPermissionMode];

/**
 * What a selected backend (agent CLI or model endpoint) supports, so the
 * composer can gate its controls. Presentational contract only — the consumer
 * builds one descriptor per backend and passes it in; the package hardcodes no
 * capability data.
 *
 * This shape is deliberately parallel to (and INTENDED to be derived from)
 * `@openthrottle/openthrottle-drivers` once plan dde67342 lands — see the
 * package README's "Capability descriptors" note. Until then consumers
 * hand-seed it from `loadAgentClis` / `loadDiscoveredModels`.
 *
 * @public
 */
export interface ChatBackendCapabilities {
  /**
   * How many repositories/checkouts the backend can hold in context at once.
   * `1` means single-select (the historical behavior); a value above `1` lets
   * the composer offer multi-select, where the FIRST selection is the primary
   * checkout (the spawn `cwd`) and the remainder are additional granted
   * directories the CLI receives as repeated `--add-dir` flags.
   */
  readonly maxRepositories: number;
  /** Permission modes the backend honors; empty hides the permission control. */
  readonly permissionModes: readonly ChatPermissionMode[];
  /** Reasoning levels the backend honors; empty hides the reasoning section. */
  readonly reasoningLevels: readonly ChatReasoningLevel[];
  /**
   * True when the backend runs against a repository/checkout (agent CLIs), so
   * the composer shows {@link ChatCheckoutSelector}. False for stateless
   * model endpoints.
   */
  readonly requiresRepository: boolean;
  /** Service tiers the backend honors; empty hides the tier section. */
  readonly serviceTiers: readonly ChatServiceTier[];
  /**
   * True when the backend accepts an explicit model selection (a `--model`
   * flag or equivalent). False for CLIs whose model is fixed.
   */
  readonly supportsModelFlag: boolean;
}

/**
 * A selectable agent/persona in the composer toolbar's persona control. Shaped
 * close to the OpenThrottle personas registry so consumer wiring stays cheap.
 *
 * @public
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
 * @public
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
 * @public
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
 * @public
 */
export const ChatComposerMicState = {
  disabled: 'disabled',
  finalizing: 'finalizing',
  idle: 'idle',
  recording: 'recording',
} as const;

/** Union of {@link ChatComposerMicState} values. @public */
export type ChatComposerMicState =
  (typeof ChatComposerMicState)[keyof typeof ChatComposerMicState];

/**
 * A workspace file referenced from the composer via an `@`-mention. `path` is
 * the workspace-relative POSIX path inserted into the draft — the in-draft
 * token is the plain text `@<path>` (v1 uses no contenteditable chips). `label`
 * is an optional display string (defaults to the path) for a future chip/menu
 * rendering. See {@link parseFileMentions} for extracting these from a submitted
 * message.
 *
 * @public
 */
export interface ChatFileMention {
  /** Optional display label; when omitted, renderers fall back to {@link path}. */
  readonly label?: string;
  /** Workspace-relative POSIX path, e.g. `src/app/root.tsx`. */
  readonly path: string;
}

/**
 * Async file-source contract the composer consumes to back the `@`-mention
 * popover. Presentational only — the package embeds NO transport; a consumer
 * (e.g. openthrottle-developer's `/ide/files` resource route) supplies
 * {@link onQueryFiles}, keyed on the currently selected repository/checkout.
 * When no provider is passed, the composer behaves exactly as before (no
 * `@`-trigger).
 *
 * @public
 */
export interface ChatMentionProvider {
  /** Shown in the popover when a query resolves to zero files. */
  readonly emptyLabel?: string;
  /** Shown in the popover while {@link onQueryFiles} is pending. */
  readonly loadingLabel?: string;
  /**
   * Resolve workspace-relative POSIX paths matching `query` (the text typed
   * after `@`, empty string for the initial listing). The consumer owns the
   * transport, filtering, debouncing across it, and any result cap.
   */
  readonly onQueryFiles: (query: string) => Promise<readonly string[]>;
}

/**
 * A skill offered by the composer's `/`-command popover. `slug` is the command
 * token inserted into the draft (the in-draft token is the plain text
 * `/<slug>`); `description` is a short summary shown muted beside it.
 * `disabledForModel` marks a skill the model may not auto-invoke — it stays
 * user-selectable via `/`, but the popover surfaces a subtle marker rather than
 * dropping it. See {@link parseSlashCommand} for extracting the slug/args from a
 * submitted message.
 *
 * @public
 */
export interface ChatSlashCommand {
  /** Short summary shown beside the slug in the popover. */
  readonly description: string;
  /**
   * True when the model is barred from auto-invoking this skill. The command
   * remains user-selectable; renderers surface a marker instead of hiding it.
   */
  readonly disabledForModel?: boolean;
  /** Command token inserted after `/`, e.g. `skills` or `vercel:ai-sdk`. */
  readonly slug: string;
}

/**
 * Async skill-source contract the composer consumes to back the `/`-command
 * popover. Presentational only — the package embeds NO transport; a consumer
 * (e.g. openthrottle-developer's `/skills/autocomplete` resource route) supplies
 * {@link onQuerySkills}. When no provider is passed, the composer behaves
 * exactly as before (no `/`-trigger). Parallel to {@link ChatMentionProvider}.
 *
 * @public
 */
export interface ChatSlashCommandProvider {
  /** Shown in the popover when a query resolves to zero skills. */
  readonly emptyLabel?: string;
  /** Shown in the popover while {@link onQuerySkills} is pending. */
  readonly loadingLabel?: string;
  /**
   * Resolve skills matching `query` (the text typed after `/`, empty string for
   * the initial listing). The consumer owns the transport, filtering,
   * debouncing across it, and any result cap.
   */
  readonly onQuerySkills: (
    query: string,
  ) => Promise<readonly ChatSlashCommand[]>;
}
