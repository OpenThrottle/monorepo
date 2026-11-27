import type { NormalizedTokenUsage } from '@openthrottle/agentic-token-usage';
import type * as React from 'react';

import type { ChatComposerToolbarProps } from './components/ChatComposerToolbar';
import type { ChatConversationSidebarProps } from './components/ChatConversationSidebar';

/** Who authored a chat message in the thread. */
export type ChatMessageRole = 'assistant' | 'system' | 'user';

/**
 * Rendered event kinds within an assistant turn. The backend wire stream emits
 * `tool_call` and `tool_result` separately; the client correlates them into a
 * single `tool` event, so the rendered kinds collapse those two into one.
 *
 * @public
 */
export const CHAT_TURN_EVENT_KIND = {
  deniedActions: 'deniedActions',
  session: 'session',
  text: 'text',
  thinking: 'thinking',
  tool: 'tool',
  usage: 'usage',
  usageLimit: 'usageLimit',
} as const;

export type ChatTurnEventKindKey = keyof typeof CHAT_TURN_EVENT_KIND;
/** Union of {@link CHAT_TURN_EVENT_KIND} values. @public */
export type ChatTurnEventKindValue =
  (typeof CHAT_TURN_EVENT_KIND)[ChatTurnEventKindKey];

/**
 * Lifecycle of a single tool invocation. `running` once the tool_call is seen,
 * `succeeded` once its tool_result arrives, `failed` if the turn errors while
 * the call is still outstanding. `notRun` when the backend reports the call
 * never ran — agy cancels the calls it had batched once a permission is
 * refused, and those are neither failures nor successes.
 *
 * @public
 */
export const CHAT_TOOL_STATUS = {
  failed: 'failed',
  notRun: 'not_run',
  running: 'running',
  succeeded: 'succeeded',
} as const;

export type ChatToolStatusKey = keyof typeof CHAT_TOOL_STATUS;
/** Union of {@link CHAT_TOOL_STATUS} values. @public */
export type ChatToolStatusValue = (typeof CHAT_TOOL_STATUS)[ChatToolStatusKey];

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
  /**
   * True when the server clipped this call's arguments or result to fit the
   * persisted tool_metadata cap, so the card shows a prefix, not the whole
   * payload. Absent on live turns and on anything saved whole.
   */
  readonly payloadTruncated?: true;
  /** Raw tool result payload as JSON (from the tool_result), when present. */
  readonly resultJson: string | null;
  readonly sortOrder: number;
  readonly status: ChatToolStatusValue;
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

/**
 * @description One MCP server the agent CLI reported connecting at session start.
 *
 * @public
 */
export interface ChatMcpServer {
  readonly name: string;
  /** The CLI's own status word (`connected`, `failed`, `needs-auth`, ...). */
  readonly status: string;
}

/** Backend session handle confirmation (e.g. a resumed cursor chat id). @public */
export interface ChatTurnSessionEvent {
  readonly kind: 'session';
  /** MCP servers the CLI reported at init; undefined when the backend reports none. */
  readonly mcpServers: readonly ChatMcpServer[] | undefined;
  readonly sessionId: string | null;
  readonly sortOrder: number;
}

/**
 * The backend's subscription account hit a usage limit (claude's 5-hour or
 * weekly window). There is at most one per turn. `rateLimitType` is the raw
 * window name (`five_hour`, `seven_day`, …); `resetsAt` is an ISO-8601 instant,
 * or null when the reset time is unknown.
 *
 * @public
 */
export interface ChatTurnUsageLimitEvent {
  readonly kind: 'usageLimit';
  readonly rateLimitType: string | null;
  readonly resetsAt: string | null;
  readonly sortOrder: number;
}

/**
 * What the turn was refused permission for, as readable labels (agy's
 * `denied_actions` display names, or the titles of calls the ACP client
 * refused). There is at most one per turn. A refusal can end a turn with no
 * answer text, so this is what explains it.
 *
 * @public
 */
export interface ChatTurnDeniedActionsEvent {
  readonly actions: readonly string[];
  readonly kind: 'deniedActions';
  readonly sortOrder: number;
}

/** One choice the agent offered for a permission request. @public */
export interface ChatPermissionOption {
  readonly kind: string;
  readonly name: string;
  readonly optionId: string;
}

/**
 * How a permission request was settled: the chosen `optionId`, or null when the
 * request was cancelled (turn aborted, ended, or dismissed).
 *
 * @public
 */
export interface ChatPermissionResolution {
  readonly optionId: string | null;
  readonly outcome: 'cancelled' | 'selected';
}

/**
 * An ACP permission request awaiting (or settled by) a human decision. A
 * `resolution` of null means it is still pending.
 *
 * @public
 */
export interface ChatTurnPermissionEvent {
  readonly kind: 'permission';
  readonly options: readonly ChatPermissionOption[];
  readonly requestId: string;
  readonly resolution: ChatPermissionResolution | null;
  readonly sortOrder: number;
  readonly toolKind: string | null;
  readonly toolTitle: string;
}

/**
 * Answers a permission request: `optionId` picks an offered option, null cancels.
 *
 * @public
 */
export type ChatPermissionResponder = (
  requestId: string,
  optionId: string | null,
) => void;

/**
 * One structured event within an assistant turn, ordered by `sortOrder`.
 * Discriminated on `kind`.
 *
 * @public
 */
export type ChatTurnEvent =
  | ChatTurnDeniedActionsEvent
  | ChatTurnPermissionEvent
  | ChatTurnSessionEvent
  | ChatTurnTextEvent
  | ChatTurnThinkingEvent
  | ChatTurnToolEvent
  | ChatTurnUsageEvent
  | ChatTurnUsageLimitEvent;

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
export const CHAT_RUN_PHASE = {
  connecting: 'connecting',
  runningTool: 'running-tool',
  stillWorking: 'still-working',
  thinking: 'thinking',
  waiting: 'waiting',
} as const;

export type ChatRunPhaseKey = keyof typeof CHAT_RUN_PHASE;
/** Union of {@link CHAT_RUN_PHASE} values. @public */
export type ChatRunPhaseValue = (typeof CHAT_RUN_PHASE)[ChatRunPhaseKey];

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
  readonly phase?: ChatRunPhaseValue;
  /**
   * Subject for {@link phase} (a model or tool name) composed into the indicator
   * label, when known. Ignored unless `phase` is set.
   */
  readonly phaseDetail?: string | null;
  readonly role: ChatMessageRole;
}

/** Input for appending a row to an uncontrolled local thread (`useChatMessages`). */
export interface AppendChatMessageInput {
  readonly body: string;
  readonly createdAt?: string;
  readonly footer?: string | null;
  readonly id?: string;
  readonly role: ChatMessageRole;
}

/**
 * The turn a conversation is still streaming on the server: the assistant
 * message id its chunks carry, and when it started (ISO string).
 * @public
 */
export interface ChatActiveTurn {
  readonly assistantMessageId: string;
  readonly startedAt: string;
}

/** JSON shape returned by a root `load-agent-conversation-messages` action. */
export interface LoadAgentConversationMessagesResult {
  /** The turn still running when the messages loaded, or null when none is. */
  readonly activeTurn: ChatActiveTurn | null;
  readonly conversationId: string | null;
  readonly errorMessage: string | null;
  /**
   * Position of the page's oldest row among all of the conversation's rows,
   * oldest first: 0 means nothing earlier exists. Counted from the oldest end,
   * so turns appended after the load never shift it.
   */
  readonly firstMessageIndex: number;
  readonly messages: readonly ChatMessage[];
}

/**
 * @description The thread's Load earlier control: pages back through a
 * restored conversation's older messages.
 * @public
 */
export interface ChatThreadLoadEarlier {
  /** True while rows older than the oldest shown one exist. */
  readonly hasEarlier: boolean;
  readonly isLoading: boolean;
  readonly onLoadEarlier: () => void;
}

/**
 * One conversation row for the conversations sidebar/switcher list. Data-only,
 * shared by the loader/action intents that fetch it and the presentational
 * {@link ChatConversationSidebar} that renders it.
 */
export interface AgentConversationListItem {
  /** The user-defined group the conversation sits in, or null when ungrouped. */
  readonly groupId: string | null;
  readonly id: string;
  /** Pinned to the top of the sidebar. Never true together with {@link groupId}. */
  readonly pinned: boolean;
  readonly status: string;
  readonly title: string | null;
  readonly updatedAt: string;
}

/** A user-defined conversation group, listed in `sortOrder`. @public */
export interface AgentConversationGroup {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
}

/**
 * What the conversations sidebar is editing inline: a conversation title, a
 * group name, or the name of a group being created (optionally to receive a
 * conversation). @public
 */
export type ChatConversationEditTarget =
  | { readonly conversationId: string | null; readonly kind: 'new-group' }
  | { readonly id: string; readonly kind: 'conversation' }
  | { readonly id: string; readonly kind: 'group' };

/**
 * Pinning and user-defined groups for {@link ChatConversationSidebar}. A host
 * that supplies it gets the Pinned section, group sections, and the Pin /
 * Move to group menu items; one that omits it gets date sections only.
 * @public
 */
export interface ChatConversationGrouping {
  /** Group ids shown collapsed (the host persists them). */
  readonly collapsedGroupIds: readonly string[];
  readonly groups: readonly AgentConversationGroup[];
  readonly onCreateGroup: (name: string, conversationId: string | null) => void;
  readonly onDeleteGroup: (groupId: string) => void;
  readonly onMoveToGroup: (
    conversationId: string,
    groupId: string | null,
  ) => void;
  readonly onRenameGroup: (groupId: string, name: string) => void;
  /** Save a new group order: every group id once, top to bottom. */
  readonly onReorderGroups: (groupIds: readonly string[]) => void;
  readonly onSetPinned: (conversationId: string, pinned: boolean) => void;
  readonly onToggleGroupCollapsed: (groupId: string) => void;
}

/** JSON shape returned by the `list-groups` intent. @public */
export interface ListAgentConversationGroupsResult {
  readonly errorMessage: string | null;
  readonly groups: readonly AgentConversationGroup[];
}

/**
 * JSON shape returned by the group intents (`create-group`, `rename-group`,
 * `delete-group`). `conversation` is set when `create-group` also moved a
 * conversation into the new group. @public
 */
export interface MutateAgentConversationGroupResult {
  readonly conversation: AgentConversationListItem | null;
  readonly errorMessage: string | null;
  readonly group: AgentConversationGroup | null;
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
 * Result of the conversation-stream start action the agentic turn hook reads.
 * Structural, so each app's route action result is assignable.
 * @public
 */
export interface ChatStartActionResult {
  readonly assistantMessageId?: string | null;
  readonly conversationId?: string | null;
  readonly errorMessage?: string | null;
  readonly userMessageId?: string | null;
}

/**
 * A message the user sent while a turn was still running, waiting to be sent
 * as its own turn. `fields` is the backend payload captured when it was queued,
 * so it runs with the toolbar selections the user saw at the time.
 *
 * @public
 */
export interface ChatQueuedMessage {
  readonly fields: Readonly<Record<string, string>>;
  readonly id: string;
  readonly message: string;
}

/**
 * A model group after the picker resolves it: the synthetic favorites group,
 * each provider group with its models, and the catch-all for ungrouped models.
 * @public
 */
export interface ResolvedGroup {
  readonly icon?: React.ReactNode;
  readonly id: string;
  readonly label: string;
  readonly models: readonly ChatModelOption[];
}

/**
 * A selectable repository/checkout for the composer's checkout selector (the
 * screenshots' "Current checkout" affordance). Presentational — the consumer
 * supplies the list from its own repository registry; the package resolves
 * nothing.
 *
 * Everything past `id` + `label` is optional identity used to group, search and
 * disambiguate rows. A consumer that supplies none of it (the admin app's
 * narrower discovery query) gets exactly today's bare display-name rendering.
 *
 * @public
 */
/**
 * Whether a checkout is a repository's primary clone or a linked git worktree.
 * As-const object (no enum, repo rule).
 *
 * @public
 */
export const CHAT_CHECKOUT_KIND = {
  primary: 'primary',
  worktree: 'worktree',
} as const;

export type ChatCheckoutKindKey = keyof typeof CHAT_CHECKOUT_KIND;
/** Union of {@link CHAT_CHECKOUT_KIND} values. @public */
export type ChatCheckoutKindValue =
  (typeof CHAT_CHECKOUT_KIND)[ChatCheckoutKindKey];

export interface ChatCheckoutOption {
  /**
   * The branch the checkout is on right now, when an inspection scan has
   * reported it. Never the repository default: that is {@link defaultBranch},
   * so a surface cannot present a guess as the current branch.
   */
  readonly branch?: string;
  /**
   * The repository's default branch. Shown as a fallback only, and labelled as
   * the default, when {@link branch} is not yet known.
   */
  readonly defaultBranch: string | undefined;
  /**
   * Absolute path on the host. The row/trigger qualifier of last resort — used
   * when there is no remote to derive `owner/name` from, or when `owner/name`
   * is itself ambiguous.
   */
  readonly filesystemPath?: string;
  readonly id: string;
  /**
   * Primary clone or linked worktree. Absent reads as primary: the picker
   * only nests a row under its repository when it positively knows the row
   * is a worktree.
   */
  readonly kind?: ChatCheckoutKindValue;
  readonly label: string;
  /** Linked project name. Searchable, never rendered as the qualifier. */
  readonly projectName?: string;
  /**
   * Origin remote URL as git recorded it. Parsed at render time into
   * `{ host, owner, name }`; absent or unparseable falls back to
   * {@link filesystemPath}.
   */
  readonly remoteUrl?: string;
}

/**
 * Reasoning-effort levels a backend may expose in the composer's
 * reasoning/tier control. As-const object (no enum, repo rule). Which levels
 * are actually selectable is gated per-backend by
 * {@link ChatBackendCapabilities.reasoningLevels}.
 *
 * @public
 */
export const CHAT_REASONING_LEVEL = {
  extraHigh: 'extraHigh',
  high: 'high',
  low: 'low',
  max: 'max',
  medium: 'medium',
  ultra: 'ultra',
} as const;

export type ChatReasoningLevelKey = keyof typeof CHAT_REASONING_LEVEL;
/** Union of {@link CHAT_REASONING_LEVEL} values. @public */
export type ChatReasoningLevelValue =
  (typeof CHAT_REASONING_LEVEL)[ChatReasoningLevelKey];

/**
 * Service tier a backend may expose in the reasoning/tier control. `standard`
 * = default queue; `fast` = priority/low-latency. As-const object (no enum).
 * Gated per-backend by {@link ChatBackendCapabilities.serviceTiers}.
 *
 * @public
 */
export const CHAT_SERVICE_TIER = {
  fast: 'fast',
  standard: 'standard',
} as const;

export type ChatServiceTierKey = keyof typeof CHAT_SERVICE_TIER;
/** Union of {@link CHAT_SERVICE_TIER} values. @public */
export type ChatServiceTierValue =
  (typeof CHAT_SERVICE_TIER)[ChatServiceTierKey];

/**
 * Permission posture for an agent backend. `supervised` asks before commands
 * and file changes; `autoAcceptEdits` auto-approves edits but asks before
 * other actions; `fullAccess` runs commands and edits without prompts.
 * As-const object (no enum). Gated per-backend by
 * {@link ChatBackendCapabilities.permissionModes}.
 *
 * @public
 */
export const CHAT_PERMISSION_MODE = {
  autoAcceptEdits: 'autoAcceptEdits',
  fullAccess: 'fullAccess',
  supervised: 'supervised',
} as const;

export type ChatPermissionModeKey = keyof typeof CHAT_PERMISSION_MODE;
/** Union of {@link CHAT_PERMISSION_MODE} values. @public */
export type ChatPermissionModeValue =
  (typeof CHAT_PERMISSION_MODE)[ChatPermissionModeKey];

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
  readonly permissionModes: readonly ChatPermissionModeValue[];
  /** Reasoning levels the backend honors; empty hides the reasoning section. */
  readonly reasoningLevels: readonly ChatReasoningLevelValue[];
  /**
   * True when the backend runs against a repository/checkout (agent CLIs), so
   * the composer shows {@link ChatCheckoutSelector}. False for stateless
   * model endpoints.
   */
  readonly requiresRepository: boolean;
  /** Service tiers the backend honors; empty hides the tier section. */
  readonly serviceTiers: readonly ChatServiceTierValue[];
  /**
   * True when Supervised asks before file edits; false when the backend applies
   * edits unasked and Supervised only gates commands and tools.
   */
  readonly supervisedGatesEdits: boolean;
  /**
   * True when the backend accepts an explicit model selection (a `--model`
   * flag or equivalent). False for CLIs whose model is fixed.
   */
  readonly supportsModelFlag: boolean;
}

/**
 * The composer toolbar's capability-gated props: the backend descriptor plus
 * the reasoning / service-tier / permission-mode selections it gates. Split out
 * of `ChatComposerToolbarProps` (which extends it) so the toolbar stays within
 * the component line cap; the public prop shape is unchanged.
 *
 * @public
 */
export interface ChatComposerCapabilityProps {
  /**
   * Selected backend's capabilities. Gates the reasoning/tier, permission and
   * checkout controls; omitting it renders none of them.
   */
  readonly capabilities?: ChatBackendCapabilities;
  readonly onPermissionModeChange?: (mode: ChatPermissionModeValue) => void;
  readonly onReasoningChange?: (level: ChatReasoningLevelValue) => void;
  /**
   * Shows the permission control's "Remember my choice" opt-in; omit to hide.
   * Pair with {@link ChatComposerCapabilityProps.rememberPermissionMode}.
   */
  readonly onRememberPermissionModeChange?: (remember: boolean) => void;
  readonly onServiceTierChange?: (tier: ChatServiceTierValue) => void;
  /** Selected permission mode; pair with `capabilities`. */
  readonly permissionMode?: ChatPermissionModeValue;
  /** Selected reasoning level; pair with `capabilities`. */
  readonly reasoning?: ChatReasoningLevelValue;
  /** Keep an elevated permission mode across sessions instead of resetting it. */
  readonly rememberPermissionMode?: boolean;
  /** Selected service tier; pair with `capabilities`. */
  readonly serviceTier?: ChatServiceTierValue;
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
export const CHAT_COMPOSER_MODE = {
  build: 'build',
  plan: 'plan',
} as const;

export type ChatComposerModeKey = keyof typeof CHAT_COMPOSER_MODE;
/** Union of {@link CHAT_COMPOSER_MODE} values. */
export type ChatComposerModeValue =
  (typeof CHAT_COMPOSER_MODE)[ChatComposerModeKey];

/**
 * Voice-input state surfaced by the composer toolbar's mic control. `idle` =
 * not capturing; `recording` = mic live (pulsing affordance); `finalizing` =
 * the last transcript snapshot is settling after stop; `disabled` = voice
 * input unavailable. As-const object (no enum). Presentational — capture and
 * transcription logic live in the consumer.
 *
 * @public
 */
export const CHAT_COMPOSER_MIC_STATE = {
  disabled: 'disabled',
  finalizing: 'finalizing',
  idle: 'idle',
  recording: 'recording',
} as const;

export type ChatComposerMicStateKey = keyof typeof CHAT_COMPOSER_MIC_STATE;
/** Union of {@link CHAT_COMPOSER_MIC_STATE} values. @public */
export type ChatComposerMicStateValue =
  (typeof CHAT_COMPOSER_MIC_STATE)[ChatComposerMicStateKey];

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

/**
 * The full agentic-composer surface a host app injects to upgrade
 * {@link ChatDialog} from a bare thread + composer to the seven-control
 * {@link ChatComposerToolbar} + streaming send/stop. It is exactly
 * {@link ChatComposerToolbarProps} (minus its layout `className`) plus the
 * composer's streaming affordance — every field optional and presentational.
 * When a host supplies this, {@link ChatDialog} renders the toolbar and threads
 * the streaming state through the composer; when it does not, the dialog stays
 * the bare legacy shell. The package hardcodes no option/capability data — the
 * host owns all state (selections, discovery data, capabilities, mic, streaming).
 *
 * @public
 */
export interface ChatComposerControls extends Omit<
  ChatComposerToolbarProps,
  'className'
> {
  /**
   * When true, the last turn timed out and its single automatic retry is spent —
   * {@link ChatDialog} renders a manual Retry affordance wired to {@link onRetry}.
   */
  readonly canRetry?: boolean;
  /**
   * Mirrors the composer's `isStreaming`: when true the composer swaps Send for
   * a Stop button wired to {@link onStop}.
   */
  readonly isStreaming?: boolean;
  /** Pages back through a restored thread; {@link ChatDialog} renders the control. */
  readonly loadEarlier?: ChatThreadLoadEarlier;
  /** Answers an ACP permission request card; see {@link ChatPermissionResponder}. */
  readonly onRespondToPermission?: ChatPermissionResponder;
  /** Replay the last turn; surfaced by the Retry affordance when {@link canRetry}. */
  readonly onRetry?: () => void;
  /** Invoked when the composer's Stop button is pressed while {@link isStreaming}. */
  readonly onStop?: () => void;
  /**
   * Cumulative session token usage (summed across turns via `sumUsage`),
   * rendered as the composer's running {@link ChatUsageCounter}. Presentational —
   * the consumer owns the total. Omit to hide the counter.
   */
  readonly sessionUsage?: ChatTokenUsage;
  /** Opt in to the composer's context-window meter (see `ChatContextMeter`). */
  readonly showContextMeter?: boolean;
}

export interface ChatContextValue {
  /**
   * Optional agentic-composer surface. When present, {@link ChatDialog} renders
   * the {@link ChatComposerToolbar} + streaming send/stop; when absent it falls
   * back to the bare thread + composer (the dormant legacy path).
   */
  readonly composer: ChatComposerControls | undefined;
  readonly composerDisabled: boolean;
  /**
   * Optional persisted-conversations switcher. When present, {@link ChatDialog}
   * renders a "Conversations" popover backed by {@link ChatConversationSidebar}
   * (list / restore / rename / soft-delete / new chat). Omit for the bare shell.
   */
  readonly conversationSidebar: ChatConversationSidebarProps | undefined;
  readonly messages: readonly ChatMessage[];
  readonly onOpenChange: ((open: boolean) => void) | undefined;
  readonly onSendMessage: (message: string) => void;
  /**
   * When set (persisted chat mode), {@link ChatDialog} renders a New chat control.
   */
  readonly onStartNewChat: (() => void) | undefined;
  readonly open: boolean | undefined;
}

/**
 * A snapshot of the settings the next turn of a chat runs with, as the
 * composer holds them. Shown by the session drawer's Environment section.
 *
 * @public
 */
export interface ChatSessionEnvironment {
  /** Label of the agent (backend) the selected model runs on. */
  readonly agentLabel: string | undefined;
  /** The checkout the agent works in, when one is selected. */
  readonly checkout: ChatCheckoutOption | undefined;
  /** Label of the selected model. */
  readonly modelLabel: string | undefined;
  readonly permissionMode: ChatPermissionModeValue | undefined;
  readonly reasoning: ChatReasoningLevelValue | undefined;
}

/** How a file differs from the checkout's base branch. */
export type ChatSessionDiffFileStatus =
  'added' | 'deleted' | 'modified' | 'renamed';

/** One file of a {@link ChatSessionDiff}. */
export interface ChatSessionDiffFile {
  readonly additions: number;
  /** True for a binary file: it has no patch. */
  readonly binary: boolean;
  readonly deletions: number;
  /** Relative to the checkout root, like the Files section's paths. */
  readonly path: string;
  /** Where a renamed file used to live. */
  readonly previousPath: string | undefined;
  readonly status: ChatSessionDiffFileStatus;
}

/** The pull request a checkout's branch has, when the forge knows one. */
export interface ChatSessionDiffPullRequest {
  readonly number: number;
  /** 'open', 'merged' or 'closed'. */
  readonly state: string;
  readonly url: string;
}

/** A checkout whose changes could not be computed. */
export interface ChatSessionDiffUnavailable {
  readonly available: false;
  /** Why the diff is unavailable. */
  readonly reason: string | undefined;
}

/** A checkout's computed changes against its base branch. */
export interface ChatSessionDiffAvailable {
  readonly additions: number;
  readonly available: true;
  /** The base branch ref the diff is measured from (e.g. origin/main). */
  readonly baseRef: string | undefined;
  readonly deletions: number;
  readonly files: readonly ChatSessionDiffFile[];
  /** True when more files changed than `files` lists. */
  readonly filesTruncated: boolean;
  readonly headBranch: string | undefined;
  readonly pullRequest: ChatSessionDiffPullRequest | undefined;
}

/**
 * A checkout's changes against its base branch, as the session drawer's
 * Changes section shows them: computed (`available: true`) or not, with the
 * reason. A plain mirror of the host's query, so the package stays free of any
 * GraphQL client.
 *
 * @public
 */
export type ChatSessionDiff =
  ChatSessionDiffAvailable | ChatSessionDiffUnavailable;

/**
 * @description Builds a deep link that opens a file in the user's editor from the file's path
 * as the drawer shows it; returns null for a file it cannot link.
 *
 * @public
 */
export type ChatFileHrefBuilder = (path: string) => string | null;

/**
 * The session drawer's Changes state, owned by the host: the checkout's diff, the selected
 * file and its lazily loaded patch, and the callbacks that drive them.
 */
export interface ChatSessionChanges {
  /**
   * Deep link that opens a file in the user's editor, given the file's path as the
   * drawer shows it (relative to the checkout). Undefined when the host has no editor or
   * checkout path; returns null for a file it cannot link. The drawer hides the control
   * in both cases.
   */
  readonly buildFileHref: ChatFileHrefBuilder | undefined;
  /** The checkout's changes; undefined until fetched or when no checkout is known. */
  readonly diff: ChatSessionDiff | undefined;
  readonly isLoading: boolean;
  /** True when the host cut the selected file's patch at its size cap. */
  readonly isPatchTruncated: boolean;
  /** Closes the patch dialog; the host clears the selected file. */
  readonly onCloseFile: () => void;
  readonly onRefresh: () => void;
  readonly onSelectFile: (path: string) => void;
  /** Path (relative to the checkout) whose patch is open in the dialog. */
  readonly selectedFile: string | undefined;
  /** The selected file's unified patch; undefined while it loads. */
  readonly selectedPatch: string | undefined;
}
