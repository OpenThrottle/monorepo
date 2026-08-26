/**
 * Public surface of the antigravity backend: the backend itself and the bin-env constant used by
 * discovery. Parsing internals (argv, events) stay module-private to the adapter.
 */
export { ANTIGRAVITY_BIN_ENV, ANTIGRAVITY_DEFAULT_BIN } from './argv.ts';
export { createAntigravityEventMapper } from './events.ts';
export { antigravityConversationBackend } from './antigravity.ts';
