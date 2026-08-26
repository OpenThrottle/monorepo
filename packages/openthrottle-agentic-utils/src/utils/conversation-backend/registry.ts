/**
 * The single source of truth mapping a driver id → its streaming
 * {@link ConversationBackend}. This is the ONE place a CLI backend is wired: the
 * server derives its routing map directly from here (no per-driver server edit),
 * and a guard test (`__tests__/registry.test.ts`) asserts this registry's keys
 * exactly match the drivers whose `capabilities.chatStreaming` is true — so the
 * routing registry and the chat-capable flag can never silently drift.
 *
 * To add a streaming backend for a future driver:
 *   1. The driver is already in `@openthrottle/openthrottle-drivers` (discovery
 *      is derived from `ALL_DRIVERS`).
 *   2. Add its `conversation-backend/<id>/` adapter (argv/events/<cli>/index).
 *   3. Add one entry here, keyed by the driver id.
 *   4. Flip that driver's `capabilities.chatStreaming: true`.
 * The guard test enforces (3) ⟺ (4); discovery, the composer, the resolver's
 * accepted-backend allowlist, and server routing all light up from there.
 */

import { antigravityConversationBackend } from './antigravity/index.ts';
import { claudeConversationBackend } from './claude/index.ts';
import { codexConversationBackend } from './codex/index.ts';
import { cursorAgentConversationBackend } from './cursor-agent/index.ts';
import { geminiConversationBackend } from './gemini/index.ts';
import { grokConversationBackend } from './grok/index.ts';
import { opencodeConversationBackend } from './opencode/index.ts';
import type { ConversationBackend } from './types.ts';

/**
 * CLI streaming backends keyed by driver id (the `backend` discriminator).
 * openai is the default HTTP path and is intentionally NOT here — it is not a
 * driver-backed CLI backend.
 *
 * @public
 */
export const CONVERSATION_CLI_BACKENDS: Readonly<
  Record<string, ConversationBackend>
> = {
  antigravity: antigravityConversationBackend,
  claude: claudeConversationBackend,
  codex: codexConversationBackend,
  cursor: cursorAgentConversationBackend,
  gemini: geminiConversationBackend,
  grok: grokConversationBackend,
  opencode: opencodeConversationBackend,
};
