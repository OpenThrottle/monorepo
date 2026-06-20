/**
 * @description Builds {@link WorkflowRalphContext} and {@link WorkflowOptions} from GraphQL
 * `RalphPlanRunTuningInput` (enqueue / job tuning). Keeps Ralph argv-equivalent defaults aligned
 * with the workflow flow-context contract (`contract/flow-context`).
 */
import { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';
import { RalphNestedDebugCli } from '../../__generated__/graphql.js';
import type { RalphPlanRunTuningInput } from '../../__generated__/graphql.js';
import type {
  WorkflowRalphContext,
  WorkflowDebug,
  WorkflowOptions,
  WorkflowMode,
} from './contract/flow-context.js';
import {
  DEFAULT_RALPH_RUNNER,
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
} from './contract/flow-context.js';

/**
 * @description Maps GraphQL {@link RalphNestedDebugCli} to {@link WorkflowDebug}.
 */
const mapRalphNestedDebugCliToWorkflowDebugCli = (
  raw: RalphNestedDebugCli | null | undefined,
): WorkflowDebug => {
  if (!raw || raw === null) {
    return 'omit';
  }

  switch (raw) {
    case RalphNestedDebugCli.Debug:
      return 'debug';

    case RalphNestedDebugCli.Omit:
      return 'omit';

    case RalphNestedDebugCli.Verbose:
      return 'verbose';

    default:
      return 'omit';
  }
};

/** @description Known ids; aligned with `RALPH_EXECUTION_BACKEND_IDS` in tools/workflows. */
const WORKFLOW_RUNNER_IDS = ['claude', 'cursor'] as const;

/**
 * @description Maps GraphQL / job `backend` string to {@link WorkflowConfigRunner}; unknown values fall back
 * to {@link DEFAULT_RALPH_RUNNER}.
 */
const resolveExecutionBackend = (
  raw: string | null | undefined,
): WorkflowConfigRunner => {
  if (raw == null || raw === '') {
    return DEFAULT_RALPH_RUNNER;
  }

  const n = raw.trim().toLowerCase();

  if ((WORKFLOW_RUNNER_IDS as readonly string[]).includes(n)) {
    return n as unknown as WorkflowConfigRunner;
  }

  return DEFAULT_RALPH_RUNNER;
};

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
  readonly executionBackend?: string | null;
  readonly mode?: WorkflowMode;
  readonly planId: string;
  readonly ralph?: RalphPlanRunTuningInput | null | undefined;
  readonly taskId?: string;
}): WorkflowOptions {
  const r = params.ralph ?? {};
  const planId = params.planId.trim();
  const mode = params.mode ?? 'plan';
  const taskId = (params.taskId ?? '').trim();
  const iterations = resolveIterationsFromTuning(r.iterations);
  const iterationTimeout = resolveIterationTimeoutSecondsFromTuning(
    r.iterationTimeoutSeconds,
  );

  const worktree = r.worktree?.trim() ?? '';
  const worktreeBase = r.worktreeBase?.trim() ?? '';

  return {
    debug: mapRalphNestedDebugCliToWorkflowDebugCli(r.ralphDebugCli),
    iterationMax: iterations,
    iterationTimeout,
    iterations,
    mode,
    model: resolveModelFromTuning(r.model),
    planId,
    project: resolveProjectFromTuning(r.project),
    prompt: resolvePromptFromTuning(r.prompt),
    runner: resolveExecutionBackend(r.backend ?? params.executionBackend),
    skipWorktreeSetup: r.skipWorktreeSetup === true ? true : undefined,
    taskId,
    timeout: iterationTimeout,
    worktree: worktree !== '' ? worktree : undefined,
    worktreeBase: worktreeBase !== '' ? worktreeBase : undefined,
  };
}

/**
 * @description Builds {@link WorkflowRalphContext} from a full {@link WorkflowOptions}
 * (e.g. developer UI / argv preview). Applies the task single-task rule (effective `iterations = 1`)
 * unless {@link WorkflowOptions.taskIterations} opts into an override; keeps
 * {@link WorkflowOptions.iterations} as the user-facing value.
 */
export function buildRalphFlowContextFromRunOptionsShape(
  input: WorkflowOptions,
): WorkflowRalphContext {
  const isTaskMode = input.mode === 'task';
  const effectiveTaskIterations =
    input.taskIterations != null &&
    Number.isInteger(input.taskIterations) &&
    input.taskIterations >= 1
      ? input.taskIterations
      : 1;

  return {
    ...input,
    iterations: isTaskMode ? effectiveTaskIterations : input.iterations,
    kind: 'ralph',
    mode: input.mode,
  };
}

/**
 * @description Resolves {@link WorkflowRalphContext} from enqueue / job tuning plus plan scope.
 * Queued runs: pass `mode: 'plan'` and omit `taskId` so context matches BullMQ plan-scoped argv
 * (see `openthrottle-ralph-parity.ts` queue vs CLI notes).
 */
export function buildRalphFlowContextFromPlanRunTuning(params: {
  readonly executionBackend?: string | null;
  readonly mode?: WorkflowMode;
  readonly planId: string;
  readonly ralph?: RalphPlanRunTuningInput | null | undefined;
  readonly taskId?: string;
}): WorkflowRalphContext {
  return buildRalphFlowContextFromRunOptionsShape(
    resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning(params),
  );
}
