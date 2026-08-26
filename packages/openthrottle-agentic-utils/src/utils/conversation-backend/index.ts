/**
 * Conversation backends: a uniform async-iterable streaming seam over both an
 * OpenAI-compatible endpoint and spawned agentic CLIs (e.g. cursor-agent).
 */
export * from './agent-discovery.ts';
export * from './agent-setup-executor.ts';
export * from './antigravity/index.ts';
export * from './claude/index.ts';
export * from './codex/index.ts';
export * from './cursor-agent/index.ts';
export * from './gemini/index.ts';
export * from './grok/index.ts';
export * from './keepalive.ts';
export * from './openai.ts';
export * from './opencode/index.ts';
export * from './registry.ts';
export * from './types.ts';
