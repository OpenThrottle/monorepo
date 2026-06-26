/**
 * @description Server-side Cortex client exports for use by apps (e.g. dashboard loaders).
 * Use this entry point to avoid pulling in the full MCP server.
 */

export { getPostgresConfig } from './config.ts';
export type { CortexPostgresConfig } from './config.ts';
export { embedQuery } from './embedding.ts';
export {
  getChunkById,
  listSources,
  runSemanticSearch,
  searchAgentAssets,
  searchPlansBySemanticQuery,
} from './cortex-client.ts';
export type {
  AgentAssetSearchChunk,
  PlanStatusCount,
  SemanticSearchChunk,
} from './cortex-client.ts';
