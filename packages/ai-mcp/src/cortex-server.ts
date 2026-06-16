/**
 * @description Server-side Cortex client exports for use by apps (e.g. dashboard loaders).
 * Use this entry point to avoid pulling in the full MCP server.
 */

export {
  applyWorkflowRalphBinPath,
  buildWorkflowRalphSpawnEnv,
  getPostgresConfig,
  OPENTHROTTLE_POSTGRES_URL_ENV,
  resolveWorkflowRalphBinDir,
  WORKFLOW_RALPH_OT_ROOT_ENV,
} from './config.js';
export type {
  BuildWorkflowRalphSpawnEnvOptions,
  CortexPostgresConfig,
  WorkflowRalphSpawnMergedDefaults,
} from './config.js';
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
