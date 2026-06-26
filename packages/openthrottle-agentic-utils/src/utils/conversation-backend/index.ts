/**
 * Conversation backends: a uniform async-iterable streaming seam over an
 * OpenAI-compatible endpoint (and, later, spawned agentic CLIs).
 */
export * from './agent-discovery.ts';
export * from './cursor-agent/index.ts';
export * from './openai.ts';
export * from './types.ts';
