/**
 * @description Workflow GraphQL: env helpers, {@link buildWorkflowExecuteGraphqlV2Options}, and
 * {@link executeWorkflowGraphqlV2} wrapping {@link executeGraphqlV2} from `@openthrottle/nodejs-graphql`.
 * Ralph plan-run helpers are re-exported from {@link context.js}; codegen documents live
 * under `graphql/*.graphql`.
 *
 * FIXME: richer thrown errors (full `errors[]`, extensions, HTTP metadata) when `@openthrottle/nodejs-graphql` exposes them.
 */
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { ExecuteGraphqlOptionsV2 } from '@openthrottle/nodejs-graphql';
import { executeGraphqlV2, getGraphQLUrl } from '@openthrottle/nodejs-graphql';

export { buildRalphFlowContextFromPlanRunTuning } from './context.js';

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
 * @description Runs a codegen document against OpenThrottle GraphQL using workflow env
 * (`resolveWorkflowGraphqlConfigFromEnv` + {@link buildWorkflowExecuteGraphqlV2Options}). Throws on
 * HTTP or GraphQL errors (first message / status text); callers should use try/catch when they need to
 * branch or log without unwinding.
 */
export async function executeWorkflowGraphqlV2<
  TData,
  TVariables extends Record<string, unknown>,
>(
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
): Promise<TData> {
  const options = buildWorkflowExecuteGraphqlV2Options(
    resolveWorkflowGraphqlConfigFromEnv(),
  );

  // FIXME: wrap with structured error mapping (status, errors[], extensions) when upstream exposes it; callers use try/catch today
  return executeGraphqlV2(document, variables, options);
}

/**
 * @description Resolves optional Bearer token from env: `OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN`, then `MCP_DEVELOPER_AUTH_TOKEN` (same token source as mcp-developer for local parity).
 *
 * **Env-only (never in `.workflow-ralph.json`):** auth tokens and GraphQL URL overrides.
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
 *
 * **Env-only:** deployment-specific endpoints are not read from `.workflow-ralph.json`.
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
