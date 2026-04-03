import type { GetServerHealthQuery } from '../__generated__/graphql.js';
import { GetServerHealthDocument } from '../__generated__/graphql.js';
import type { WorkflowGraphqlConfig } from './workflow-graphql.js';
import {
  executeWorkflowGraphql,
  type WorkflowGraphqlResult,
} from './workflow-graphql.js';

/**
 * @description Runs the public `getServerHealth` query via {@link executeWorkflowGraphql}. Optional preflight for api/database/redis/websocket when the HTTP POST succeeds; transport failures use the same `WorkflowGraphqlResult` error codes as other workflow GraphQL calls (e.g. `WORKFLOW_GRAPHQL_HTTP` when the HTTP response is not OK). Does not replace Ralph's Cortex TCP check (`ensureCortexReachableOrExit`). See `tools/workflows/README.md` (section getServerHealth vs WORKFLOW_GRAPHQL_HTTP).
 */
export async function fetchWorkflowServerHealth(
  config: WorkflowGraphqlConfig,
): Promise<WorkflowGraphqlResult<GetServerHealthQuery>> {
  return executeWorkflowGraphql(config, GetServerHealthDocument, {});
}
