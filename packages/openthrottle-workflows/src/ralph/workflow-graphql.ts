/**
 * @description OpenThrottle GraphQL from workflows: typed client ({@link createWorkflowGraphqlClient}), env config ({@link resolveWorkflowGraphqlConfigFromEnv}), non-throwing {@link executeWorkflowGraphql} via {@link executeGraphql_v2}, re-exports from `@openthrottle/nodejs-graphql`, and codegen documents under `graphql/*.graphql` only.
 */
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { executeGraphql_v2, getGraphQLUrl } from '@openthrottle/nodejs-graphql';
import type { GraphqlV2Failure } from '@openthrottle/nodejs-graphql';
import { RalphNestedDebugCli } from '../__generated__/graphql.js';
import type { RalphPlanRunTuningInput } from '../__generated__/graphql.js';
import type {
  WorkflowRalphContext,
  WorkflowDebug,
  WorkflowRunner,
  WorkflowOptions,
  WorkflowMode,
} from './contract/flow-context.js';
import {
  DEFAULT_RALPH_RUNNER,
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
} from './contract/flow-context.js';
import type { WorkflowError } from './contract/workflow-error.js';

/**
 * @description Configuration for OpenThrottle GraphQL requests from workflow code (auth, optional endpoint override, extra headers).
 */
export interface WorkflowGraphqlConfig {
  /**
   * @description Extra headers merged after `Content-Type` and optional `Authorization` (e.g. tracing or feature flags).
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
 * @description Discriminated error codes for workflow GraphQL transport and response handling.
 */
export type WorkflowGraphqlErrorCode =
  | 'WORKFLOW_GRAPHQL_GRAPHQL_ERRORS'
  | 'WORKFLOW_GRAPHQL_HTTP'
  | 'WORKFLOW_GRAPHQL_MISSING_DATA'
  | 'WORKFLOW_GRAPHQL_UNKNOWN';

/**
 * @description Structured failure for workflow GraphQL calls; maps thrown errors and GraphQL error payloads.
 */
export interface WorkflowGraphqlError extends WorkflowError {
  readonly code: WorkflowGraphqlErrorCode;
  readonly graphqlPath?: ReadonlyArray<string | number>;
  readonly httpStatus?: number;
}

/**
 * @description Maps an unknown thrown value to {@link WorkflowGraphqlError} for {@link executeWorkflowGraphql} err results.
 */
export function mapUnknownToWorkflowGraphqlError(
  thrown: unknown,
): WorkflowGraphqlError {
  if (thrown instanceof Error) {
    const message = thrown.message;
    const code = inferCodeFromMessage(message);

    return {
      cause: thrown,
      code,
      graphqlPath: undefined,
      httpStatus: inferHttpStatusFromMessage(message),
      message,
    };
  }

  return {
    cause: undefined,
    code: 'WORKFLOW_GRAPHQL_UNKNOWN',
    graphqlPath: undefined,
    httpStatus: undefined,
    message: String(thrown),
  };
}

function inferCodeFromMessage(message: string): WorkflowGraphqlErrorCode {
  if (message.includes('GraphQL response missing data')) {
    return 'WORKFLOW_GRAPHQL_MISSING_DATA';
  }

  if (message.startsWith('GraphQL errors:')) {
    return 'WORKFLOW_GRAPHQL_GRAPHQL_ERRORS';
  }

  if (/openthrottle-server GraphQL error \d+:/.test(message)) {
    return 'WORKFLOW_GRAPHQL_HTTP';
  }

  return 'WORKFLOW_GRAPHQL_UNKNOWN';
}

function inferHttpStatusFromMessage(message: string): number | undefined {
  const match = /openthrottle-server GraphQL error (\d+):/.exec(message);
  if (match?.[1] == null) {
    return undefined;
  }

  const n = Number.parseInt(match[1], 10);

  return Number.isNaN(n) ? undefined : n;
}

function mapGraphqlV2FailureKindToWorkflowCode(
  kind: GraphqlV2Failure['kind'],
): WorkflowGraphqlErrorCode {
  switch (kind) {
    case 'graphql_errors':
      return 'WORKFLOW_GRAPHQL_GRAPHQL_ERRORS';
    case 'http':
      return 'WORKFLOW_GRAPHQL_HTTP';
    case 'missing_data':
      return 'WORKFLOW_GRAPHQL_MISSING_DATA';
    case 'invalid_json':
    case 'network':
    case 'unknown':
      return 'WORKFLOW_GRAPHQL_UNKNOWN';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/**
 * @description Maps {@link GraphqlV2Failure} from {@link executeGraphql_v2} to {@link WorkflowGraphqlError} (same codes as legacy thrown-message mapping).
 */
export function mapGraphqlV2FailureToWorkflowGraphqlError(
  failure: GraphqlV2Failure,
): WorkflowGraphqlError {
  return {
    cause: failure.cause instanceof Error ? failure.cause : undefined,
    code: mapGraphqlV2FailureKindToWorkflowCode(failure.kind),
    graphqlPath: failure.graphqlPath,
    httpStatus: failure.httpStatus,
    message: failure.message,
  };
}

/**
 * @description Successful GraphQL data payload from {@link executeWorkflowGraphql}.
 */
export interface WorkflowGraphqlOkResult<TData> {
  readonly data: TData;
  readonly ok: true;
}

/**
 * @description Failed GraphQL call with structured {@link WorkflowGraphqlError}.
 */
export interface WorkflowGraphqlErrResult {
  readonly error: WorkflowGraphqlError;
  readonly ok: false;
}

/**
 * @description Result of {@link executeWorkflowGraphql} (discriminated union; no thrown errors from transport).
 */
export type WorkflowGraphqlResult<TData> =
  | WorkflowGraphqlErrResult
  | WorkflowGraphqlOkResult<TData>;

/**
 * @description Merges Bearer and optional {@link WorkflowGraphqlConfig.additionalHeaders} for `@openthrottle/nodejs-graphql` request options.
 */
export function buildWorkflowGraphqlHeaders(
  config: WorkflowGraphqlConfig,
): Record<string, string> {
  const out: Record<string, string> = {
    ...config.additionalHeaders,
  };

  const token = config.token?.trim();

  if (token != null && token !== '') {
    out.Authorization = `Bearer ${token}`;
  }

  return out;
}

/**
 * @description Executes a codegen TypedDocumentNode against OpenThrottle GraphQL and returns a result (no throw on HTTP/GraphQL errors). Delegates to {@link executeGraphql_v2} with explicit `url`: {@link WorkflowGraphqlConfig.graphqlUrl} when set, otherwise {@link getGraphQLUrl} (`API_URL_INTERNAL` + `/graphql`).
 */
export async function executeWorkflowGraphql<
  TData,
  TVariables extends Record<string, unknown>,
>(
  config: WorkflowGraphqlConfig,
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
): Promise<WorkflowGraphqlResult<TData>> {
  let url: string;

  try {
    const override = config.graphqlUrl?.trim();
    url = override != null && override !== '' ? override : getGraphQLUrl();
  } catch (thrown) {
    return {
      error: mapUnknownToWorkflowGraphqlError(thrown),
      ok: false,
    };
  }

  const token =
    config.token != null && config.token.trim() !== ''
      ? config.token.trim()
      : undefined;

  const result = await executeGraphql_v2(document, variables, {
    headers: config.additionalHeaders,
    token,
    url,
  });

  if (result.ok) {
    return { data: result.data, ok: true };
  }

  return {
    error: mapGraphqlV2FailureToWorkflowGraphqlError(result.error),
    ok: false,
  };
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
 * @description Optional full GraphQL HTTP endpoint (e.g. `http://localhost:6021/graphql`). When unset, callers use `API_URL_INTERNAL` via {@link executeGraphql} from `@openthrottle/nodejs-graphql`.
 */
export function resolveWorkflowGraphqlUrlOverrideFromEnv(): string | undefined {
  const raw = process.env.OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';

  return trimmed === '' ? undefined : trimmed;
}

/**
 * @description Builds workflow GraphQL config from environment (token + optional URL override). Does not validate that `API_URL_INTERNAL` is set when no URL override is provided; the HTTP client throws when the URL cannot be resolved.
 */
export function resolveWorkflowGraphqlConfigFromEnv(): WorkflowGraphqlConfig {
  return {
    graphqlUrl: resolveWorkflowGraphqlUrlOverrideFromEnv(),
    token: resolveWorkflowAuthTokenFromEnv(),
  };
}

/**
 * @description Single integration surface for workflow GraphQL: holds {@link WorkflowGraphqlConfig} and exposes {@link WorkflowGraphqlClient.execute}.
 */
export interface WorkflowGraphqlClient {
  readonly config: WorkflowGraphqlConfig;
  execute<TData, TVariables extends Record<string, unknown>>(
    document: TypedDocumentNode<TData, TVariables>,
    variables?: TVariables,
  ): Promise<WorkflowGraphqlResult<TData>>;
}

/**
 * @description Creates a {@link WorkflowGraphqlClient} backed by codegen documents and shared config (mcp-developer-style: one client, typed operations).
 */
export function createWorkflowGraphqlClient(
  config: WorkflowGraphqlConfig,
): WorkflowGraphqlClient {
  return {
    config,
    execute: <TData, TVariables extends Record<string, unknown>>(
      document: TypedDocumentNode<TData, TVariables>,
      variables?: TVariables,
    ) => executeWorkflowGraphql(config, document, variables),
  };
}

/**
 * @description Maps GraphQL {@link RalphNestedDebugCli} to {@link WorkflowDebug}.
 */
const mapRalphNestedDebugCliToWorkflowDebugCli = (
  raw: RalphNestedDebugCli | null | undefined,
): WorkflowDebug => {
  if (raw == null) {
    return 'omit';
  }

  switch (raw) {
    case RalphNestedDebugCli.Debug:
      return 'debug';
    case RalphNestedDebugCli.Verbose:
      return 'verbose';
    case RalphNestedDebugCli.Omit:
      return 'omit';
    default:
      return 'omit';
  }
};

/**
 * @description `WorkflowRalphExecutionBackendId` is a single literal today; GraphQL `backend` is
 * accepted for parity and future union widening.
 */
const resolveExecutionBackend = (
  _raw: string | null | undefined,
): WorkflowRunner => DEFAULT_RALPH_RUNNER;

const resolveIterationsFromTuning = (
  raw: number | null | undefined,
): number => {
  if (raw == null) {
    return DEFAULT_RALPH_ITERATIONS;
  }

  if (!Number.isInteger(raw) || raw < 1) {
    return DEFAULT_RALPH_ITERATIONS;
  }

  return raw;
};

const resolveIterationTimeoutSecondsFromTuning = (
  raw: number | null | undefined,
): number | undefined => {
  if (raw == null) {
    return undefined;
  }

  if (!Number.isInteger(raw) || raw < 1) {
    return undefined;
  }

  return raw;
};

const resolveModelFromTuning = (raw: string | null | undefined): string => {
  const t = raw?.trim() ?? '';
  if (t === '') {
    return DEFAULT_RALPH_MODEL;
  }

  return t;
};

const resolvePromptFromTuning = (raw: string | null | undefined): string => {
  const t = raw?.trim() ?? '';
  if (t === '') {
    return DEFAULT_RALPH_PROMPT;
  }

  return t;
};

const resolveProjectFromTuning = (raw: string | null | undefined): string => {
  return raw?.trim() ?? '';
};

/**
 * @description Merges optional `ralph` / nested tuning (GraphQL {@link RalphPlanRunTuningInput} or
 * worker job tuning with the same field names) with defaults so the result matches
 * {@link WorkflowOptions}. Ignores `promptFile` — layer-1 argv only; not on {@link WorkflowRalphContext}.
 */
export function resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning(params: {
  readonly planId: string;
  readonly ralph?: RalphPlanRunTuningInput | null | undefined;
  readonly targetMode?: WorkflowMode;
  readonly taskId?: string;
}): WorkflowOptions {
  const r = params.ralph ?? {};
  const planId = params.planId.trim();
  const targetMode = params.targetMode ?? 'plan';
  const taskId = (params.taskId ?? '').trim();

  return {
    debugCli: mapRalphNestedDebugCliToWorkflowDebugCli(r.ralphDebugCli),
    executionBackend: resolveExecutionBackend(r.backend),
    iterationTimeoutSeconds: resolveIterationTimeoutSecondsFromTuning(
      r.iterationTimeoutSeconds,
    ),
    iterations: resolveIterationsFromTuning(r.iterations),
    model: resolveModelFromTuning(r.model),
    planId,
    project: resolveProjectFromTuning(r.project),
    prompt: resolvePromptFromTuning(r.prompt),
    targetMode,
    taskId,
  };
}

/**
 * @description Builds {@link WorkflowRalphContext} from a full {@link WorkflowOptions}
 * (e.g. developer UI / argv preview). Applies task `maxIterations === 1` rule; keeps
 * {@link WorkflowOptions.iterations} as the user-facing value.
 */
export function buildRalphFlowContextFromRunOptionsShape(
  input: WorkflowOptions,
): WorkflowRalphContext {
  const isTaskMode = input.targetMode === 'task';
  const mode: WorkflowRalphContext['mode'] = isTaskMode ? 'task' : 'plan';
  const maxIterations = input.targetMode === 'task' ? 1 : input.iterations;

  return {
    ...input,
    kind: 'ralph',
    maxIterations,
    mode,
  };
}

/**
 * @description Resolves {@link WorkflowRalphContext} from enqueue / job tuning plus plan scope.
 * Queued runs: pass `targetMode: 'plan'` and omit `taskId` so context matches BullMQ plan-scoped argv
 * (see `openthrottle-ralph-parity.ts` queue vs CLI notes).
 */
export function buildRalphFlowContextFromPlanRunTuning(params: {
  readonly planId: string;
  readonly ralph?: RalphPlanRunTuningInput | null | undefined;
  readonly targetMode?: WorkflowMode;
  readonly taskId?: string;
}): WorkflowRalphContext {
  return buildRalphFlowContextFromRunOptionsShape(
    resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning(params),
  );
}

/**
 * @description Re-exports from `@openthrottle/nodejs-graphql` — the shared runtime for OpenThrottle GraphQL (V1 throwing helpers, V2 non-throwing executor, URL helper). {@link executeWorkflowGraphql} uses {@link executeGraphql_v2} internally.
 */
export {
  executeGraphql,
  executeGraphqlAtUrl,
  executeGraphql_v2,
  executeGraphqlWithAuth,
  getGraphQLUrl,
  type ExecuteGraphqlAtUrlOptions,
  type ExecuteGraphqlOptions,
  type ExecuteGraphqlV2,
  type GraphqlResponse,
  type GraphqlV2ErrResult,
  type GraphqlV2ExecuteOptions,
  type GraphqlV2Failure,
  type GraphqlV2FailureContext,
  type GraphqlV2FailureKind,
  type GraphqlV2GraphqlErrorItem,
  type GraphqlV2MapFailure,
  type GraphqlV2OkResult,
  type GraphqlV2ResponsePayload,
  type GraphqlV2Result,
} from '@openthrottle/nodejs-graphql';
