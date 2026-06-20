/**
 * @description Server-side Cortex client exports for use by apps (e.g. dashboard loaders).
 * Use this entry point to avoid pulling in the full MCP server.
 */

export { getPostgresConfig } from './config.js';
export type { CortexPostgresConfig } from './config.js';
export { embedQuery } from './embedding.js';
export {
  getChunkById,
  listSources,
  runSemanticSearch,
  searchAgentAssets,
  searchPlansBySemanticQuery,
} from './cortex-client.js';
export type {
  AgentAssetSearchChunk,
  PlanStatusCount,
  SemanticSearchChunk,
} from './cortex-client.js';
