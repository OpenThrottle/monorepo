import {
  ChatPermissionMode,
  ChatReasoningLevel,
  ChatServiceTier,
} from '@openthrottle/react-router-chat';
import type { ChatBackendCapabilities } from '@openthrottle/react-router-chat';
import type { DecodedChatOption } from './chat-model-option';

/**
 * @description Per-backend capability descriptors for the chat composer.
 *
 * WHICH backends and models the composer offers is registry-derived: agent-CLI
 * discovery (`discoverAgentClis`) projects `@openthrottle/openthrottle-drivers`'
 * `ALL_DRIVERS` and surfaces, per driver, its `chatCapable` flag and `models` —
 * so only chat-capable drivers reach the picker and each carries its own model
 * list (see the app-side `toAgentChatOptions` mapper). The drivers registry is a
 * Node package (its engine imports `child_process`), so it is NOT imported into
 * this browser bundle; the registry-derived facts arrive over discovery instead.
 *
 * The two descriptors below are the CONTROL SURFACE, which is an openai-vs-CLI
 * distinction rather than a per-driver one: a local OpenAI endpoint is a plain
 * completion, and every agent-CLI driver exposes the same T3 controls.
 */

/**
 * Local OpenAI-compatible endpoints: a plain completion. The model is chosen
 * from the picker; no reasoning/tier/permission controls and no repository.
 * @public
 */
export const OPENAI_BACKEND_CAPABILITIES: ChatBackendCapabilities = {
  permissionModes: [],
  reasoningLevels: [],
  requiresRepository: false,
  serviceTiers: [],
  supportsModelFlag: true,
};

/**
 * Agent CLI backends (cursor, claude, codex, …): run in a repository checkout
 * and expose the full T3 control surface.
 * @public
 */
export const CLI_BACKEND_CAPABILITIES: ChatBackendCapabilities = {
  permissionModes: [
    ChatPermissionMode.supervised,
    ChatPermissionMode.autoAcceptEdits,
    ChatPermissionMode.fullAccess,
  ],
  reasoningLevels: [
    ChatReasoningLevel.low,
    ChatReasoningLevel.medium,
    ChatReasoningLevel.high,
  ],
  requiresRepository: true,
  serviceTiers: [ChatServiceTier.standard, ChatServiceTier.fast],
  supportsModelFlag: true,
};

/**
 * Capabilities for the currently-selected composer option. OpenAI endpoints get
 * the minimal descriptor; every CLI backend gets the agent descriptor.
 * @public
 */
export function capabilitiesForChatOption(
  decoded: DecodedChatOption | null,
): ChatBackendCapabilities {
  if (decoded == null || decoded.backend === 'openai') {
    return OPENAI_BACKEND_CAPABILITIES;
  }

  return CLI_BACKEND_CAPABILITIES;
}
