import type { LoopOutputKind } from '@openthrottle/openthrottle-agentic-loop';
import type {
  WorkflowExecuteGraphqlV2,
  WorkflowRalphCommandRunner,
} from '@openthrottle/openthrottle-agentic-ralph';
import type {
  AgentDriver,
  DriverInvocationConfig,
  DriverReasoningEffort,
  RunDriverOptions,
  UsageLimit,
} from '@openthrottle/openthrottle-drivers';

/** @description The worker-scoped GraphQL executor (same contract as Ralph's). */
export type OtLoopExecuteGraphql = WorkflowExecuteGraphqlV2;

/** @description One chunk for plan output: what it is, and where in the run it belongs. */
export interface PlanOutputChunk {
  /** 1-based attempt inside a task; `undefined` for plan-scoped lines. */
  readonly attempt: number | undefined;
  readonly kind: LoopOutputKind;
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
  readonly effort: DriverReasoningEffort | undefined;
  /** Env merged over the inherited one; blanks the OT credentials (§ 2). */
  readonly env: Readonly<Record<string, string>>;
  /** Receives the limit when an attempt closed on one, so the service can schedule the resume. */
  readonly onUsageLimit: (usageLimit: UsageLimit) => void;
  readonly output: PlanOutputWriter;
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
  readonly runCommand: WorkflowRalphCommandRunner;
}
