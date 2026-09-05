/**
 * @description Workflow GraphQL: env helpers, {@link buildWorkflowExecuteGraphqlV2Options} (throw-based
 * options for the injected orchestrator executor), and {@link executeWorkflowGraphqlV2}, which returns a
 * non-throwing {@link GraphqlV2Result} via `executeGraphql_v2` so callers can classify transport vs
 * GraphQL vs auth failures on the {@link GraphqlV2Failure} `kind` instead of string-matching
 * `Error.message`. {@link unwrapWorkflowGraphqlResult} / {@link WorkflowGraphqlError} bridge the Result
 * to throw-based call sites while preserving the structured failure. Ralph plan-run helpers are
 * re-exported from {@link context.js}; codegen documents live under `graphql/*.graphql`.
 */
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type {
  ExecuteGraphqlOptionsV2,
  GraphqlV2ExecuteOptions,
  GraphqlV2Failure,
  GraphqlV2Result,
} from '@openthrottle/nodejs-graphql';
import {
  DEFAULT_GRAPHQL_TIMEOUT_MS,
  executeGraphql_v2,
  getGraphQLUrl,
} from '@openthrottle/nodejs-graphql';

export { buildRalphFlowContextFromPlanRunTuning } from './context.ts';
// Re-exported so consumers of {@link WorkflowGraphqlError} / {@link executeWorkflowGraphqlV2} can type
// the structured failure without reaching into `@openthrottle/nodejs-graphql` directly.
export type { GraphqlV2Failure } from '@openthrottle/nodejs-graphql';

/**
 * @description Configuration for building {@link ExecuteGraphqlOptionsV2} (auth, optional endpoint override, extra headers).
 */
export interface WorkflowGraphqlConfig {
  /**
   * @description Extra headers merged after `Content-Type` and before Bearer `token` (same order as `executeGraphqlV2`).
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
 * @description Builds {@link ExecuteGraphqlOptionsV2} for the throw-based `executeGraphqlV2` (the injected
 * orchestrator executor / server worker auth) from workflow config. Uses {@link WorkflowGraphqlConfig.graphqlUrl}
 * when set, otherwise {@link getGraphQLUrl}. Throws if the URL cannot be resolved (e.g. missing `API_URL_INTERNAL`).
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
 * @description Builds {@link GraphqlV2ExecuteOptions} for `executeGraphql_v2` from workflow config.
 * Resolves the URL like {@link buildWorkflowExecuteGraphqlV2Options} and enforces the default request
 * timeout via `AbortSignal.timeout` — the Result API has no `timeoutMs`, only `signal`. A timeout aborts
 * `fetch`, surfacing as a `network` {@link GraphqlV2Failure}. Throws if the URL cannot be resolved.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention -- `_v2` marks the Result-API variant, distinct from the throw-based `buildWorkflowExecuteGraphqlV2Options` above; the two coexist deliberately
function buildWorkflowExecuteGraphql_v2Options(
  config: WorkflowGraphqlConfig,
): GraphqlV2ExecuteOptions {
  const override = config.graphqlUrl?.trim();
  const url = override != null && override !== '' ? override : getGraphQLUrl();
  const rawToken = config.token?.trim();
  const token = rawToken != null && rawToken !== '' ? rawToken : undefined;
  const rawHeaders = config.additionalHeaders;
  const headers =
    rawHeaders != null && Object.keys(rawHeaders).length > 0
      ? { ...rawHeaders }
      : undefined;

  return {
    headers,
    signal: AbortSignal.timeout(DEFAULT_GRAPHQL_TIMEOUT_MS),
    token,
    url,
  };
}

/**
 * @description Runs a codegen document against OpenThrottle GraphQL using workflow env
 * (`resolveWorkflowGraphqlConfigFromEnv`) and returns a non-throwing {@link GraphqlV2Result}. On failure
 * the {@link GraphqlV2Failure} carries `kind` (`network` / `http` / `graphql_errors` / …), `httpStatus`,
 * and `graphqlErrors`, so callers branch on the failure shape instead of parsing `Error.message`. Use
 * {@link unwrapWorkflowGraphqlResult} to adapt to throw-based call sites.
 */
export async function executeWorkflowGraphqlV2<
  TData,
  TVariables extends Record<string, unknown>,
>(
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
): Promise<GraphqlV2Result<TData>> {
  return executeGraphql_v2(
    document,
    variables,
    buildWorkflowExecuteGraphql_v2Options(
      resolveWorkflowGraphqlConfigFromEnv(),
    ),
  );
}

/**
 * @description Error thrown by {@link unwrapWorkflowGraphqlResult}, preserving the structured
 * {@link GraphqlV2Failure} (`kind`, `httpStatus`, `graphqlErrors`) on `.failure` so a `catch` can
 * classify the fault (transport vs GraphQL vs auth) without string-matching the message.
 */
export class WorkflowGraphqlError extends Error {
  readonly failure: GraphqlV2Failure;

  constructor(failure: GraphqlV2Failure, message?: string) {
    super(message ?? failure.message);
    this.failure = failure;
    this.name = 'WorkflowGraphqlError';
  }
}

/**
 * @description Adapts a {@link GraphqlV2Result} to throw-based call sites: returns `data` on success,
 * throws {@link WorkflowGraphqlError} (carrying the {@link GraphqlV2Failure}) on failure. Lets the Ralph
 * transport helpers keep their throw-on-error contract (parity with the Postgres twins) while still
 * surfacing the structured failure to any upstream `catch`.
 */
export function unwrapWorkflowGraphqlResult<TData>(
  result: GraphqlV2Result<TData>,
): TData {
  if (result.ok) {
    return result.data;
  }

  throw new WorkflowGraphqlError(result.error);
}

/**
 * @description Resolves optional Bearer token from env: `OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN`, then `OPENTHROTTLE_MCP_AUTH_TOKEN` (same token source as openthrottle-mcp for local parity).
 *
 * **Env-only (never in `.workflow-ralph.json`):** auth tokens and GraphQL URL overrides.
 */
export function resolveWorkflowAuthTokenFromEnv(): string | undefined {
  const raw =
    process.env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN ??
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;

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
