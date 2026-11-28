/**
 * Conversation backends: a uniform async-iterable streaming seam over both an
 * OpenAI-compatible endpoint and spawned agentic CLIs (e.g. cursor-agent).
 */
export * from './types/agent-account.ts';
export * from './types/conversation-backend.ts';
export {
  ACP_IDLE_TTL_MS_ENV,
  ACP_MAX_LIVE_SESSIONS_ENV,
  type AcpConversationBackendOptions,
  createAcpConversationBackend,
} from './utils/acp.ts';
export { ACP_AGENT_SPECS, type AcpAgentSpec } from './utils/acp-agent-specs.ts';
export { resolveAcpPermission } from './utils/acp-permissions.ts';
export {
  CHAT_ACP_BACKENDS_ENV,
  isAcpChatEnabled,
  withAcpRouting,
} from './utils/acp-routing.ts';
export * from './utils/agent-account-parse.ts';
export * from './utils/agent-discovery.ts';
export * from './utils/agent-setup-executor.ts';
export { antigravityConversationBackend } from './utils/antigravity.ts';
export {
  ANTIGRAVITY_BIN_ENV,
  ANTIGRAVITY_DEFAULT_BIN,
} from './utils/antigravity-argv.ts';
export { TURN_ATTACHMENTS_DIR_PREFIX } from './utils/attachments.ts';
export * from './utils/capabilities.ts';
export { claudeConversationBackend } from './utils/claude.ts';
export { CLAUDE_BIN_ENV, CLAUDE_DEFAULT_BIN } from './utils/claude-argv.ts';
export {
  CLAUDE_ACTIVE_CREDENTIALS,
  type ClaudeActiveCredentialsValue,
  type ClaudeAuthStatus,
  type ClaudeAuthStatusEnv,
  parseClaudeAuthStatus,
  probeClaudeAuthStatus,
  type ProbeClaudeAuthStatusOptions,
} from './utils/claude-auth-status.ts';
export { mapClaudeEvent } from './utils/claude-events.ts';
export { codexConversationBackend } from './utils/codex.ts';
export { CODEX_BIN_ENV, CODEX_DEFAULT_BIN } from './utils/codex-argv.ts';
export { createAntigravityEventMapper } from './utils/createAntigravityEventMapper.ts';
export type { CodexEventMapper } from './utils/createCodexEventMapper.ts';
export { createCodexEventMapper } from './utils/createCodexEventMapper.ts';
export {
  createGrokEventMapper,
  type GrokEventMapper,
} from './utils/createGrokEventMapper.ts';
export { createOpencodeEventMapper } from './utils/createOpencodeEventMapper.ts';
export * from './utils/cursor-agent.ts';
export * from './utils/cursor-agent-errors.ts';
export * from './utils/cursor-agent-teardown.ts';
export { grokConversationBackend } from './utils/grok.ts';
export { GROK_BIN_ENV, GROK_DEFAULT_BIN } from './utils/grok-argv.ts';
export * from './utils/handoff.ts';
export * from './utils/keepalive.ts';
export { mapCursorEvent } from './utils/mapCursorEvent.ts';
export * from './utils/openai.ts';
export { opencodeConversationBackend } from './utils/opencode.ts';
export {
  OPENCODE_BIN_ENV,
  OPENCODE_DEFAULT_BIN,
} from './utils/opencode-argv.ts';
export * from './utils/registry.ts';
export * from './utils/resolveAgentAccount.ts';
export {
  type AcpAgentProcess,
  type AcpLauncher,
  spawnAcpAgent,
} from './utils/spawnAcpAgent.ts';
export * from './utils/streamChatCompletion.ts';
