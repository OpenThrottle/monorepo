/**
 * Conversation backends: a uniform async-iterable streaming seam over an
 * OpenAI-compatible endpoint (and, later, spawned agentic CLIs).
 */
export * from './agent-discovery.js';
export * from './cursor-agent/index.js';
export * from './openai.js';
export * from './types.js';
