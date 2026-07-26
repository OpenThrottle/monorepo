/**
 * Public surface of the claude backend: the backend itself and the bin-env
 * constant used by discovery. Parsing internals (argv, events) stay
 * module-private to the adapter.
 */
export { CLAUDE_BIN_ENV, CLAUDE_DEFAULT_BIN } from './argv.ts';
export { claudeConversationBackend } from './claude.ts';
export { mapClaudeEvent } from './events.ts';
