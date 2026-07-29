/**
 * Public surface of the codex backend: the backend itself and the bin-env
 * constant used by discovery. Parsing internals (argv, events) stay
 * module-private to the adapter.
 */
export { CODEX_BIN_ENV, CODEX_DEFAULT_BIN } from './argv.ts';
export { codexConversationBackend } from './codex.ts';
export { mapCodexEvent } from './events.ts';
