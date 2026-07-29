/**
 * Public surface of the grok backend: the backend itself and the bin-env
 * constant used by discovery. Parsing internals (argv, events) stay
 * module-private to the adapter.
 */
export { GROK_BIN_ENV, GROK_DEFAULT_BIN } from './argv.ts';
export { grokConversationBackend } from './grok.ts';
export { mapGrokEvent } from './events.ts';
