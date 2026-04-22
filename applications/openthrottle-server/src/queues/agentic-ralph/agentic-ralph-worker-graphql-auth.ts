import type { WorkflowGraphqlConfig } from '@openthrottle/openthrottle-agentic-ralph';
import { resolveWorkflowGraphqlUrlOverrideFromEnv } from '@openthrottle/openthrottle-agentic-ralph';

/**
 * @description Returns trimmed `process.env[key]` or `undefined` when missing/blank.
 */
const readTrimmedEnv = (key: string): string | undefined => {
  const raw = process.env[key];
  const trimmed = typeof raw === 'string' ? raw.trim() : '';

  return trimmed === '' ? undefined : trimmed;
};

/**
 * @description Bearer token for BullMQ workers calling OpenThrottle GraphQL (in-process Ralph orchestrator).
 *
 * **Resolution order**
 *
 * 1. `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN` — preferred for production worker identity.
 * 2. `OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN` — shared with CLI workflows.
 * 3. `MCP_DEVELOPER_AUTH_TOKEN` — local parity with mcp-developer.
 * 4. Non-production only: `OPENTHROTTLE_WORKER_GRAPHQL_PLACEHOLDER_TOKEN` — explicit opt-in dev/test token when no real credential is set. Ignored when `NODE_ENV` is `production`; replace with a secrets-managed or workload token before shipping.
 */
export function resolveAgenticRalphWorkerGraphqlAuthTokenFromEnv():
  | string
  | undefined {
  const primary =
    readTrimmedEnv('OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN') ??
    readTrimmedEnv('OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN') ??
    readTrimmedEnv('MCP_DEVELOPER_AUTH_TOKEN');

  if (primary != null) {
    return primary;
  }

  if (process.env.NODE_ENV !== 'production') {
    return readTrimmedEnv('OPENTHROTTLE_WORKER_GRAPHQL_PLACEHOLDER_TOKEN');
  }

  return undefined;
}

/**
 * @description GraphQL HTTP endpoint override for the agentic Ralph worker. `OPENTHROTTLE_WORKER_GRAPHQL_URL` wins over `OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL`; otherwise callers use internal URL resolution (`API_URL_INTERNAL` + `/graphql`).
 */
export function resolveAgenticRalphWorkerGraphqlUrlOverrideFromEnv():
  | string
  | undefined {
  return (
    readTrimmedEnv('OPENTHROTTLE_WORKER_GRAPHQL_URL') ??
    resolveWorkflowGraphqlUrlOverrideFromEnv()
  );
}

/**
 * @description Worker-scoped GraphQL auth + URL overrides. Pass to `buildWorkflowExecuteGraphqlV2Options` so each
 * orchestrator `executeGraphqlV2` call merges worker credentials as defaults.
 */
export function resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv(): WorkflowGraphqlConfig {
  return {
    graphqlUrl: resolveAgenticRalphWorkerGraphqlUrlOverrideFromEnv(),
    token: resolveAgenticRalphWorkerGraphqlAuthTokenFromEnv(),
  };
}
