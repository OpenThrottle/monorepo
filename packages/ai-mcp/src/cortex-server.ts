/**
 * @description Server-side Cortex client exports for use by apps (e.g. dashboard loaders).
 * Use this entry point to avoid pulling in the full MCP server.
 */

export {
  buildWorkflowRalphSpawnEnv,
  getPostgresConfig,
  OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV,
} from './config.js';
export type {
  BuildWorkflowRalphSpawnEnvOptions,
  CortexPostgresConfig,
} from './config.js';
export { embedQuery } from './embedding.js';
export {
  getChunkById,
  listSources,
  runSemanticSearch,
  searchPlansBySemanticQuery,
} from './cortex-client.js';
export type { PlanStatusCount, SemanticSearchChunk } from './cortex-client.js';
