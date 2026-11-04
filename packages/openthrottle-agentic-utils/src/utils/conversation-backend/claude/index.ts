/**
 * Public surface of the claude backend: the backend itself, the bin-env
 * constant used by discovery, and the auth-status report. Parsing internals
 * (argv, events) stay module-private to the adapter.
 */
export { CLAUDE_BIN_ENV, CLAUDE_DEFAULT_BIN } from './argv.ts';
export {
  CLAUDE_ACTIVE_CREDENTIALS,
  type ClaudeActiveCredential,
  type ClaudeAuthStatus,
  type ClaudeAuthStatusEnv,
  parseClaudeAuthStatus,
  probeClaudeAuthStatus,
  type ProbeClaudeAuthStatusOptions,
} from './auth-status.ts';
export { claudeConversationBackend } from './claude.ts';
export { mapClaudeEvent } from './events.ts';
