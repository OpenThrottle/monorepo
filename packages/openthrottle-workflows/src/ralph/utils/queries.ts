import { executeGraphqlV2 } from '@openthrottle/nodejs-graphql';
import type { GetServerHealthQuery } from '../../__generated__/graphql.js';
import { GetServerHealthDocument } from '../../__generated__/graphql.js';

/**
 * @description Runs the public `getServerHealth` query via `executeGraphqlV2` (throws on failure;
 * error message reflects HTTP status / first GraphQL error). Optional preflight for
 * api/database/redis/websocket when the HTTP POST succeeds. Does not replace Ralph's Cortex TCP check
 * (`ensureCortexReachableOrExit`). See `tools/workflows/README.md` (getServerHealth vs transport).
 */
export async function fetchServerHealth(): Promise<GetServerHealthQuery> {
  return executeGraphqlV2(GetServerHealthDocument, {});
}
