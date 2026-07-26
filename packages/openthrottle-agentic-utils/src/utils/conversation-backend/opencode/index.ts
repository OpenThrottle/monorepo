/**
 * Public surface of the opencode backend: the backend itself and the bin-env
 * constant used by discovery. Parsing internals (argv, events) stay
 * module-private to the adapter.
 */
export { OPENCODE_BIN_ENV, OPENCODE_DEFAULT_BIN } from './argv.ts';
export { createOpencodeEventMapper } from './events.ts';
export { opencodeConversationBackend } from './opencode.ts';
