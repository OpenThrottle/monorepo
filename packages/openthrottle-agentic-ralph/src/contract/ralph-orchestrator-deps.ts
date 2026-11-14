import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { ExecuteGraphqlOptionsV2 } from '@openthrottle/nodejs-graphql';
import type {
  ConversationReasoningEffort,
  TrajectoryRecord,
} from '@openthrottle/openthrottle-agentic-utils';
import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';

/**
 * @description Injectable GraphQL executor: same contract as `executeGraphqlV2` from
 * `@openthrottle/nodejs-graphql`. Orchestrator code must not perform ad-hoc HTTP; only call this with
 * codegen `TypedDocumentNode`s.
 */
export type WorkflowExecuteGraphqlV2 = <
  TData,
  TVariables extends Record<string, unknown>,
>(
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
  options?: ExecuteGraphqlOptionsV2,
) => Promise<TData>;

/**
 * @description One stdout/stderr fragment from an iteration runner; backend-agnostic (aligns with
 * `CursorAgentChunk` in `tools/workflows` `runIterationAsync`).
 */
export interface WorkflowRalphIterationStreamChunk {
  readonly data: string;
  readonly stream: 'stdout' | 'stderr';
}

/**
 * @description Optional streaming hook forwarded by {@link createWorkflowRalphOrchestrator} into each
 * `iterationRunner.run` call. The orchestrator still buffers full output for parsing; this is for side
 * effects only (logs, WebSocket, `append_plan_output`, etc.).
 */
export type WorkflowRalphIterationOnChunk = (
  chunk: WorkflowRalphIterationStreamChunk,
) => void | Promise<void>;

/**
 * @description A subscription usage limit reported by an iteration runner. Structurally identical to
 * `UsageLimit` in `@openthrottle/openthrottle-drivers` (which this package deliberately does not
 * depend on). `resetsAt` is an ISO-8601 instant; `null` means "limited, reset unknown".
 * @public
 */
export interface WorkflowRalphUsageLimit {
  readonly rateLimitType: string | null;
  readonly resetsAt: string | null;
}

/**
 * @description One agent iteration (layer-2), aligned with `tools/workflows` `RunIterationConfig` /
 * `runIterationAsync`: environment-specific runner returns combined stdout/stderr text.
 */
export interface WorkflowRalphIterationRunParams {
  readonly agentPrompt: string;
  /** @description Agent subprocess cwd (foreign `workingDirectory`). */
  readonly cwd?: string;
  /**
   * @description Reasoning effort for the run (chat vocabulary). The runner maps it to each
   * backend's own flag; a backend with no reasoning knob ignores it.
   */
  readonly effort: ConversationReasoningEffort | undefined;
  /**
   * @description Extra env for the agent subprocess, merged over `process.env`. The orchestrator
   * sets `OT_PR_DRAFT_DIR` here so the agent's PR draft lands where finalize reads it.
   */
  readonly env?: Readonly<Record<string, string>>;
  readonly iteration: number;
  readonly model: string | undefined;
  readonly onChunk?: WorkflowRalphIterationOnChunk;
  /**
   * @description Fired by the runner when the iteration closed having hit a subscription usage limit.
   * The orchestrator uses it to stop the run cleanly instead of treating the iteration as ordinary
   * (failed) agent output.
   */
  readonly onTrajectory?: (record: TrajectoryRecord) => void | Promise<void>;
  readonly onUsageLimit?: (usageLimit: WorkflowRalphUsageLimit) => void;
  readonly runner: WorkflowConfigRunner;
  readonly signal: AbortSignal | undefined;
  readonly skipWorktreeSetup?: boolean;
  readonly timeoutMs: number | undefined;
  /** Plan, run and task ids recorded under the trajectory's `extra.openthrottle`. */
  readonly trajectoryFacts?: Readonly<Record<string, unknown>>;
  readonly worktree?: string;
  readonly worktreeBase?: string;
}

/**
 * @description Injected runner for the `iteration.run` pipeline step. Implementations live outside this
 * package (e.g. Cursor `cursor-agent` in `tools/workflows`).
 */
export interface WorkflowRalphIterationRunner {
  readonly run: (params: WorkflowRalphIterationRunParams) => Promise<string>;
}

/**
 * @description Result of one host command (git, gh, or a local script) run by the plan-end
 * finalize step. Exit code 0 is success; stdout/stderr are UTF-8 text (may be empty).
 * @public
 */
export interface WorkflowRalphCommandResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

/**
 * @description Injectable host command runner for the plan-end finalize step (`git`, `gh`, and
 * the github-pull-request skill's `check-attribution.sh`). Unit tests supply a fake; production uses
 * {@link createDefaultWorkflowRalphCommandRunner}. Never shells — argv is passed as an array.
 * @public
 */
export type WorkflowRalphCommandRunner = (params: {
  readonly args: readonly string[];
  readonly command: string;
  readonly cwd: string;
}) => Promise<WorkflowRalphCommandResult>;

/**
 * @description Dependencies for constructing a Ralph-shaped `WorkflowOrchestrator`: GraphQL I/O and
 * iteration execution. Pass `executeGraphqlV2` from `@openthrottle/nodejs-graphql` with options from
 * `buildWorkflowExecuteGraphqlV2Options` in `graphql.ts`, or a test double.
 */
export interface WorkflowRalphOrchestratorDeps {
  readonly executeGraphqlV2: WorkflowExecuteGraphqlV2;
  readonly iterationRunner: WorkflowRalphIterationRunner;

  /**
   * @description When set, passed through to every {@link WorkflowRalphIterationRunner.run} call as
   * {@link WorkflowRalphIterationRunParams.onChunk} so embedders can stream without importing runner
   * internals.
   */
  readonly onChunk?: WorkflowRalphIterationOnChunk;

  /**
   * @description Host command runner for the plan-end push/PR finalize step. When set, a finished
   * plan (`workflow_complete` / `workflow_tasks_exhausted` / `workflow_complete_handoff_owed`)
   * runs the deterministic push + PR step through this runner. A plan that ends BLOCKED
   * (`workflow_tasks_blocked`) also runs it, but its PR stays a draft. When omitted, finalize is skipped
   * (loop-only / unit-test paths). The server deps factory wires
   * {@link createDefaultWorkflowRalphCommandRunner}. Credentials are the worker host's existing
   * `git` / `gh` auth — a non-host (docker) worker without those credentials fails finalize into
   * `workflow_complete_handoff_owed` rather than FAILED; the agent container is never asked to push.
   */
  readonly runCommand?: WorkflowRalphCommandRunner;
}
