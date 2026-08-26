/**
 * Public surface of the gemini backend: the backend itself and the bin-env
 * constant used by discovery. Parsing internals (argv, events) stay
 * module-private to the adapter.
 */
export { GEMINI_BIN_ENV, GEMINI_DEFAULT_BIN } from './argv.ts';
export { createGeminiEventMapper } from './events.ts';
export { geminiConversationBackend } from './gemini.ts';
