/**
 * @description Public API for @openthrottle/node-client — the Node-only OpenThrottle data client
 * (Postgres vector search + plan/task/note CRUD + embeddings). Consumed by openthrottle-server
 * resolvers/services and the agent-asset ingest script.
 */

export * from './config.ts';
export * from './constants.ts';
export * from './data-source.ts';
export * from './embedding.ts';
export * from './embedding-config.ts';
export * from './embedding-content.ts';
export * from './embedWithGemini.ts';
export * from './embedWithOllama.ts';
export * from './embedWithOpenAI.ts';
export * from './local-embedding.ts';
export * from './local-embedding-tuning.ts';
export * from './openthrottle-client.ts';
export * from './resolveCodeEmbeddingPolicy.ts';
