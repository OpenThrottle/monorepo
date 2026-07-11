/**
 * @description Public API for @openthrottle/node-client — the Node-only Cortex data client
 * (Postgres vector search + plan/task/note CRUD + embeddings). Consumed by openthrottle-server
 * resolvers/services and the agent-asset ingest script.
 */

export * from './config.ts';
export * from './constants.ts';
export * from './cortex-client.ts';
export * from './data-source.ts';
export * from './embedding.ts';
export * from './embedding-content.ts';
export * from './ollama-embedding.ts';
