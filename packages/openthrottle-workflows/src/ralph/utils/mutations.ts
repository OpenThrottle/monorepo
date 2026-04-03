import { executeGraphqlV2 } from '@openthrottle/nodejs-graphql';
import type { GetServerHealthQuery } from '../../__generated__/graphql.js';
import { GetServerHealthDocument } from '../../__generated__/graphql.js';

/**
 * @description Runs the public `getServerHealth` query via `executeGraphqlV2` (throws on failure;
 * error message reflects HTTP status / first GraphQL error). Placeholder mutation helper; swap in a
 * real mutation document when wired. Does not replace Ralph's Cortex TCP check
 * (`ensureCortexReachableOrExit`). See `tools/workflows/README.md` (getServerHealth vs transport).
 */
export async function fetchSomeMutation(
  _input: unknown,
): Promise<GetServerHealthQuery> {
  return executeGraphqlV2(GetServerHealthDocument, {});
}
