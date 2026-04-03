import type { GetServerHealthQuery } from '../../__generated__/graphql.js';
import { GetServerHealthDocument } from '../../__generated__/graphql.js';
import { executeWorkflowGraphqlV2 } from '../workflow-graphql.js';

/**
 * @description Runs the public `getServerHealth` query via {@link executeWorkflowGraphqlV2} (throws on
 * failure; error message reflects HTTP status / first GraphQL error). Uses workflow GraphQL env
 * (`OPENTHROTTLE_WORKFLOWS_*`); wrap in try/catch when callers need non-throwing control flow. Optional
 * preflight for api/database/redis/websocket when the HTTP POST succeeds. Does not replace Ralph's
 * Cortex TCP check (`ensureCortexReachableOrExit`). See `tools/workflows/README.md` (getServerHealth vs
 * transport).
 */
export async function fetchServerHealth(): Promise<GetServerHealthQuery> {
  return executeWorkflowGraphqlV2(GetServerHealthDocument, {});
}
