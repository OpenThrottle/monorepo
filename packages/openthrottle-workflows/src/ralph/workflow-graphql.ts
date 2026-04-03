/**
 * @description Workflow GraphQL: env helpers and {@link buildWorkflowExecuteGraphqlV2Options} for
 * {@link executeGraphqlV2} from `@openthrottle/nodejs-graphql`. Ralph plan-run helpers are re-exported
 * from {@link ralph-plan-run-context.js}; codegen documents live under `graphql/*.graphql`.
 */
import type { ExecuteGraphqlOptionsV2 } from '@openthrottle/nodejs-graphql';
import { getGraphQLUrl } from '@openthrottle/nodejs-graphql';

export {
  buildRalphFlowContextFromPlanRunTuning,
  buildRalphFlowContextFromRunOptionsShape,
  resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning,
} from './ralph-plan-run-context.js';

/**
 * @description Configuration for building {@link ExecuteGraphqlOptionsV2} (auth, optional endpoint override, extra headers).
 */
export interface WorkflowGraphqlConfig {
  /**
   * @description Extra headers merged after `Content-Type` and before Bearer `token` (same order as {@link executeGraphqlV2}).
   */
  readonly additionalHeaders?: Readonly<Record<string, string>>;
  /**
   * @description When set, POST to this URL instead of resolving `API_URL_INTERNAL` + `/graphql` inside `@openthrottle/nodejs-graphql`.
   */
  readonly graphqlUrl?: string | undefined;
  /**
   * @description Bearer token for OpenThrottle GraphQL. Omit for unauthenticated calls when the server allows them.
   */
  readonly token: string | undefined;
}

/**
 * @description Builds {@link ExecuteGraphqlOptionsV2} for {@link executeGraphqlV2} from workflow config. Uses {@link WorkflowGraphqlConfig.graphqlUrl} when set, otherwise {@link getGraphQLUrl}. Throws if the URL cannot be resolved (e.g. missing `API_URL_INTERNAL`).
 */
export function buildWorkflowExecuteGraphqlV2Options(
  config: WorkflowGraphqlConfig,
): ExecuteGraphqlOptionsV2 {
  const override = config.graphqlUrl?.trim();
  const url = override != null && override !== '' ? override : getGraphQLUrl();
  const token =
    config.token != null && config.token.trim() !== ''
      ? config.token.trim()
      : undefined;
  const rawHeaders = config.additionalHeaders;
  const headers =
    rawHeaders != null && Object.keys(rawHeaders).length > 0
      ? { ...rawHeaders }
      : undefined;

  if (headers != null && token != null) {
    return { headers, token, url };
  }

  if (headers != null) {
    return { headers, url };
  }

  if (token != null) {
    return { token, url };
  }

  return { url };
}

/**
 * @description Resolves optional Bearer token from env: `OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN`, then `MCP_DEVELOPER_AUTH_TOKEN` (same token source as mcp-developer for local parity).
 */
export function resolveWorkflowAuthTokenFromEnv(): string | undefined {
  const raw =
    process.env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN ??
    process.env.MCP_DEVELOPER_AUTH_TOKEN;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';

  return trimmed === '' ? undefined : trimmed;
}

/**
 * @description Optional full GraphQL HTTP endpoint (e.g. `http://localhost:6021/graphql`). When unset, callers use `API_URL_INTERNAL` via {@link getGraphQLUrl} from `@openthrottle/nodejs-graphql`.
 */
export function resolveWorkflowGraphqlUrlOverrideFromEnv(): string | undefined {
  const raw = process.env.OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';

  return trimmed === '' ? undefined : trimmed;
}

/**
 * @description Builds workflow GraphQL config from environment (token + optional URL override). Does not validate that `API_URL_INTERNAL` is set when no URL override is provided; {@link getGraphQLUrl} throws when the URL cannot be resolved at request time.
 */
export function resolveWorkflowGraphqlConfigFromEnv(): WorkflowGraphqlConfig {
  return {
    graphqlUrl: resolveWorkflowGraphqlUrlOverrideFromEnv(),
    token: resolveWorkflowAuthTokenFromEnv(),
  };
}
