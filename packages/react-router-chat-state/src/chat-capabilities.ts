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
 * These are hand-seeded for now. Once `@openthrottle/openthrottle-drivers`
 * (plan dde67342) lands, derive these from the driver registry (DRIVER_IDS +
 * per-driver capability flags) instead of the two constants below — see plan
 * cacb864e (honor chat controls end-to-end). Until then consumers hand-seed
 * from `loadAgentClis` / `loadDiscoveredModels`.
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
