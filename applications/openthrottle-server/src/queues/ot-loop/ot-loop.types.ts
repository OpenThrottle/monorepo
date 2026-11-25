import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { ExecuteGraphqlOptionsV2 } from '@openthrottle/nodejs-graphql';
import type { LoopOutputKindValue } from '@openthrottle/openthrottle-agentic-loop';
import type { PlanRunCommandRunner } from '@openthrottle/openthrottle-agentic-utils';
import type {
  AgentDriver,
  DriverInvocationConfig,
  DriverReasoningEffortsValue,
  DriverRepoAgentConfig,
  RunDriverOptions,
  UsageLimit,
} from '@openthrottle/openthrottle-drivers';

/**
 * @description The worker-scoped GraphQL executor: the contract of `executeGraphqlV2` from
 * `@openthrottle/nodejs-graphql`, called with codegen `TypedDocumentNode` operations only.
 */
export type OtLoopExecuteGraphql = <
  TData,
  TVariables extends Record<string, unknown>,
>(
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
  options?: ExecuteGraphqlOptionsV2,
) => Promise<TData>;

/**
 * @description Explicit GraphQL endpoint and Bearer credentials for worker/BullMQ runs. Workers have
 * no HTTP session, so the server supplies these from env (see `resolvePlanRunWorkerGraphqlConfigFromEnv`).
 */
export type PlanRunWorkerGraphqlAuth = ExecuteGraphqlOptionsV2;

/** @description Worker GraphQL auth + URL overrides read from env, before the URL is resolved. */
export interface PlanRunWorkerGraphqlConfig {
  /** POST here instead of resolving `API_URL_INTERNAL` + `/graphql` inside `@openthrottle/nodejs-graphql`. */
  readonly graphqlUrl: string | undefined;
  /** Bearer token for OpenThrottle GraphQL; `undefined` for unauthenticated calls. */
  readonly token: string | undefined;
}

/** @description One chunk for plan output: what it is, and where in the run it belongs. */
export interface PlanOutputChunk {
  /** 1-based attempt inside a task; `undefined` for plan-scoped lines. */
  readonly attempt: number | undefined;
  readonly kind: LoopOutputKindValue;
  /** The task the chunk belongs to; `undefined` = plan-scoped. */
  readonly taskId: string | undefined;
  readonly text: string;
}

/** @description Serialises writes to plan output so batches land in order, tagged with their task. */
export interface PlanOutputWriter {
  /** Resolves once every queued write has been attempted; never rejects. */
  readonly settled: () => Promise<void>;
  /** Queues a write tagged with the chunk's kind, task and attempt. */
  readonly write: (chunk: PlanOutputChunk) => void;
}

/** @description What the OT Loop `LoopClient` needs to talk to OT as the worker. */
export interface OtLoopClientOptions {
  readonly executeGraphqlV2: OtLoopExecuteGraphql;
  /** BullMQ job id recorded as `externalRef` on each per-task work session. */
  readonly externalRef: string | undefined;
  /** Writes narration; shared with the streamed output so ordering holds. */
  readonly output: PlanOutputWriter;
  readonly planId: string;
  /** The `plan_runs` row the run belongs to; stamped on claimed inbox messages and sessions. */
  readonly planRunId: string | undefined;
  /** The processor's run session id, sent on status writes. Never ended by the loop. */
  readonly workSessionId: string | null | undefined;
}

/** @description Runs one agent-CLI invocation; `runDriverAsync` in production. */
export type OtLoopRunDriver = (
  driver: AgentDriver,
  config: DriverInvocationConfig,
  options: RunDriverOptions,
) => Promise<string>;

/** @description What the OT Loop `WorkerRunner` needs. */
export interface OtLoopWorkerRunnerOptions {
  readonly cwd: string;
  readonly driver: AgentDriver;
  readonly effort: DriverReasoningEffortsValue | undefined;
  /** Explicit worker env over the engine allowlist; blanks the OT credentials (§ 2). */
  readonly env: Readonly<Record<string, string>>;
  /** Receives the limit when an attempt closed on one, so the service can schedule the resume. */
  readonly onUsageLimit: (usageLimit: UsageLimit) => void;
  readonly output: PlanOutputWriter;
  readonly planId: string;
  /** Exported to the CLI with the plan and task ids, so an in-worker hook can claim the inbox. */
  readonly planRunId: string | undefined;
  /** OT's hook payloads for this driver (`--plugin-dir` for Claude); empty loads none. */
  readonly pluginDirs: readonly string[];
  /** The checkout's trust posture; isolated spawns the worker with the repo's own config suppressed. */
  readonly repoAgentConfig: DriverRepoAgentConfig;
  readonly runDriver: OtLoopRunDriver;
  /** Per-attempt wall-clock limit; `undefined` means none. */
  readonly timeoutMs: number | undefined;
}

/** @description Everything `finalizeOtLoopRun` needs besides the plan facts. */
export interface OtLoopFinalizeOptions {
  readonly baseBranch: string;
  readonly cwd: string;
  readonly executeGraphqlV2: OtLoopExecuteGraphql;
  readonly output: PlanOutputWriter;
  readonly runCommand: PlanRunCommandRunner;
}
