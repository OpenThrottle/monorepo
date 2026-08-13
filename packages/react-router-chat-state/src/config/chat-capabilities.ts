import {
  ChatPermissionMode,
  ChatReasoningLevel,
} from '@openthrottle/react-router-chat';
import type { ChatBackendCapabilities } from '@openthrottle/react-router-chat';
import type { DecodedChatOption } from '../utils/chat-model-option';

/**
 * @description Per-backend capability descriptors for the chat composer — the
 * CONTROL SURFACE the toolbar gates on.
 *
 * WHICH backends/models the composer offers is registry-derived: agent-CLI
 * discovery (`discoverAgentClis`) projects `@openthrottle/openthrottle-drivers`'
 * `ALL_DRIVERS` and surfaces, per driver, its `chatCapable` flag and `models`.
 * The drivers registry is a Node package (its engine imports `child_process`),
 * so it is NOT imported into this browser bundle; the registry-derived facts
 * arrive over discovery instead.
 *
 * These descriptors are hand-authored HERE (browser-safe) but are the ADVERTISED
 * half of an "advertised == honored" contract with the server-side argv/request
 * builders in `@openthrottle/openthrottle-agentic-utils`. A drift-guard test
 * (node-side, where it may import the builders) asserts that every level/mode a
 * backend advertises below maps to a concrete flag the matching adapter emits,
 * and that no backend advertises a control its adapter drops — so the two halves
 * cannot silently diverge.
 */

/**
 * Local OpenAI-compatible endpoints: a plain completion against a discovered
 * LOCAL endpoint. No repository, no permission surface, and no service tier
 * (a cloud-only concept). Reasoning IS forwarded best-effort as the OpenAI
 * `reasoning_effort` request param (honored by reasoning-capable local models),
 * so the reasoning control is offered.
 * @public
 */
export const OPENAI_BACKEND_CAPABILITIES: ChatBackendCapabilities = {
  permissionModes: [],
  reasoningLevels: [
    ChatReasoningLevel.low,
    ChatReasoningLevel.medium,
    ChatReasoningLevel.high,
  ],
  requiresRepository: false,
  serviceTiers: [],
  supportsModelFlag: true,
};

/** All three composer permission postures, in UI order. */
const ALL_PERMISSION_MODES: readonly ChatPermissionMode[] = [
  ChatPermissionMode.supervised,
  ChatPermissionMode.autoAcceptEdits,
  ChatPermissionMode.fullAccess,
];

/**
 * Fallback for a chat-capable CLI backend that discovery surfaces but that has
 * no explicit entry below (e.g. a newly-added driver). Conservative: the common
 * CLI surface — all permission postures, the low/medium/high reasoning triple
 * every agent CLI honors, no service tier. The drift guard flags a known
 * backend that lacks an explicit descriptor, so this only ever covers genuinely
 * new drivers until they are characterized.
 * @public
 */
export const DEFAULT_CLI_BACKEND_CAPABILITIES: ChatBackendCapabilities = {
  permissionModes: ALL_PERMISSION_MODES,
  reasoningLevels: [
    ChatReasoningLevel.low,
    ChatReasoningLevel.medium,
    ChatReasoningLevel.high,
  ],
  requiresRepository: true,
  serviceTiers: [],
  supportsModelFlag: true,
};

/**
 * Per-CLI-backend capabilities, keyed by the driver id (`decoded.backend`).
 * Each mirrors exactly what the backend's argv/request builder honors:
 * - reasoning: every backend maps it, but to different vocabularies — claude
 *   reaches `xhigh`/`max`; opencode reaches `max`; codex/grok/cursor top out at
 *   `high` (their CLIs' ceiling). Only the DISTINCT honored levels are listed.
 * - serviceTier: only cursor routes by tier (model-string `[fast=…]`); the rest
 *   have no tier flag.
 * - permissionMode: claude/codex/grok/opencode map all three to distinct flags;
 *   cursor has only two distinct headless postures (trust-only vs `--force`), so
 *   it advertises just those.
 * @public
 */
export const CHAT_BACKEND_CAPABILITIES: Readonly<
  Record<string, ChatBackendCapabilities>
> = {
  claude: {
    permissionModes: ALL_PERMISSION_MODES,
    reasoningLevels: [
      ChatReasoningLevel.low,
      ChatReasoningLevel.medium,
      ChatReasoningLevel.high,
      ChatReasoningLevel.extraHigh,
      ChatReasoningLevel.max,
    ],
    requiresRepository: true,
    serviceTiers: [],
    supportsModelFlag: true,
  },
  codex: {
    permissionModes: ALL_PERMISSION_MODES,
    reasoningLevels: [
      ChatReasoningLevel.low,
      ChatReasoningLevel.medium,
      ChatReasoningLevel.high,
    ],
    requiresRepository: true,
    serviceTiers: [],
    supportsModelFlag: true,
  },
  cursor: {
    // Headless cursor has two distinct permission postures: trust-only (safe)
    // and `--force` (run everything). autoAcceptEdits has no distinct edits-only
    // flag, so it is not advertised.
    permissionModes: [
      ChatPermissionMode.supervised,
      ChatPermissionMode.fullAccess,
    ],
    // Reasoning + service tier are NOT separate controls for cursor — they are
    // baked into the model id (`cursor-agent models` lists concrete ids like
    // `claude-opus-4-8-high-fast`; the bracket form is rejected at run time). So
    // the model picker is the reasoning/tier selector, and neither control is
    // advertised here.
    reasoningLevels: [],
    requiresRepository: true,
    serviceTiers: [],
    supportsModelFlag: true,
  },
  grok: {
    permissionModes: ALL_PERMISSION_MODES,
    reasoningLevels: [
      ChatReasoningLevel.low,
      ChatReasoningLevel.medium,
      ChatReasoningLevel.high,
    ],
    requiresRepository: true,
    serviceTiers: [],
    supportsModelFlag: true,
  },
  opencode: {
    permissionModes: ALL_PERMISSION_MODES,
    reasoningLevels: [
      ChatReasoningLevel.low,
      ChatReasoningLevel.medium,
      ChatReasoningLevel.high,
      ChatReasoningLevel.max,
    ],
    requiresRepository: true,
    serviceTiers: [],
    supportsModelFlag: true,
  },
};

/**
 * Capabilities for the currently-selected composer option. OpenAI endpoints get
 * the completion descriptor; a CLI backend gets its per-driver descriptor (or
 * the conservative default for an as-yet-uncharacterized driver).
 * @public
 */
export function capabilitiesForChatOption(
  decoded: DecodedChatOption | null,
): ChatBackendCapabilities {
  if (decoded == null || decoded.backend === 'openai') {
    return OPENAI_BACKEND_CAPABILITIES;
  }

  return (
    CHAT_BACKEND_CAPABILITIES[decoded.backend] ??
    DEFAULT_CLI_BACKEND_CAPABILITIES
  );
}
