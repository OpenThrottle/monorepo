import {
  ChatPermissionMode,
  ChatReasoningLevel,
  ChatServiceTier,
} from '@openthrottle/react-router-chat';
import type { ChatBackendCapabilities } from '@openthrottle/react-router-chat';
import type { DecodedChatOption } from './chat-model-option';

/**
 * @description Per-backend capability descriptors for the home composer.
 *
 * These are hand-seeded for now (this plan's own contract). Once
 * `@openthrottle/openthrottle-drivers` (plan dde67342) lands, derive these from
 * the driver registry (DRIVER_IDS + per-driver capability flags) instead of the
 * two constants below. See the react-router-chat README "Capability descriptors
 * are derived from the driver registry (planned)" note.
 */

/**
 * Local OpenAI-compatible endpoints: a plain completion. The model is chosen
 * from the picker; no reasoning/tier/permission controls and no repository.
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
 */
export function capabilitiesForChatOption(
  decoded: DecodedChatOption | null,
): ChatBackendCapabilities {
  if (decoded == null || decoded.backend === 'openai') {
    return OPENAI_BACKEND_CAPABILITIES;
  }

  return CLI_BACKEND_CAPABILITIES;
}
