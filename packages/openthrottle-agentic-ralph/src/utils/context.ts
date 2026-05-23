/**
 * @description Builds {@link WorkflowContext} from GraphQL
 * `RalphPlanRunTuningInput` (enqueue / job tuning). Keeps Ralph argv-equivalent defaults aligned
 * with the workflow flow-context contract (`contract/flow-context`).
 */
import type { RalphPlanRunTuningInput } from '../__generated__/graphql.js';
import type { WorkflowContext } from '../types.js';
import {
  DEFAULT_ITERATIONS,
  DEFAULT_MODEL,
  DEFAULT_PROMPT,
  DEFAULT_RUNNER,
  type WorkflowRunner,
} from '../config/index.js';

/** @description Known backend ids; aligned with tools/workflows / GraphQL. */
const WORKFLOW_RUNNER_IDS = ['claude', 'cursor'] as const;

/**
 * @description Maps GraphQL / queue job backend strings to {@link WorkflowRunner}.
 */
const resolveExecutionBackend = (
  raw: string | null | undefined,
): WorkflowRunner => {
  if (raw == null || raw === '') {
    return DEFAULT_RUNNER;
  }

  const n = raw.trim().toLowerCase();

  if ((WORKFLOW_RUNNER_IDS as readonly string[]).includes(n)) {
    return n as unknown as WorkflowRunner;
  }

  return DEFAULT_RUNNER;
};

const resolveIterations = (raw: number | null | undefined): number => {
  if (raw == null) {
    return DEFAULT_ITERATIONS;
  }

  if (!Number.isInteger(raw) || raw < 1) {
    return DEFAULT_ITERATIONS;
  }

  return raw;
};

const resolveIterationTimeoutSeconds = (
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

const resolveDebug = (
  raw: string | null | undefined,
): WorkflowContext['debug'] => {
  const t = raw?.trim() ?? '';

  switch (t) {
    case 'debug':
      return 'debug';
    case 'omit':
      return 'omit';
    case 'verbose':
      return 'verbose';

    default:
      return 'omit';
  }
};

const resolveModel = (raw: string | null | undefined): string => {
  const t = raw?.trim() ?? '';
  if (t === '') {
    return DEFAULT_MODEL;
  }

  return t;
};

const resolvePrompt = (raw: string | null | undefined): string => {
  const t = raw?.trim() ?? '';
  if (t === '') {
    return DEFAULT_PROMPT;
  }

  return t;
};

const resolveProject = (raw: string | null | undefined): string => {
  return raw?.trim() ?? '';
};

/**
 * @description Merges optional `ralph` / nested tuning (GraphQL {@link RalphPlanRunTuningInput} or
 * worker job tuning with the same field names) with defaults so the result matches
 * {@link WorkflowContext}. Ignores `promptFile` — layer-1 argv only; not on {@link WorkflowContext}.
 */
export function resolveWorkflowRunOptions(params: {
  readonly executionBackend?: string | null;
  readonly mode?: WorkflowContext['mode'];
  readonly planId: string;
  readonly ralph?: RalphPlanRunTuningInput | null | undefined;
  readonly taskId?: string;
}): WorkflowContext {
  const r = params.ralph ?? {};
  const planId = params.planId.trim();
  const mode = params.mode ?? 'plan';
  const taskId = (params.taskId ?? '').trim();
  const iterations = resolveIterations(r.iterations);
  const iterationTimeout = resolveIterationTimeoutSeconds(
    r.iterationTimeoutSeconds,
  );

  const worktree = r.worktree?.trim() ?? '';
  const worktreeBase = r.worktreeBase?.trim() ?? '';

  return {
    debug: resolveDebug(r.ralphDebugCli),
    iterationMax: iterations,
    iterationTimeout,
    iterations,
    kind: 'ralph',
    mode,
    model: resolveModel(r.model),
    planId,
    project: resolveProject(r.project),
    prompt: resolvePrompt(r.prompt),
    runner: resolveExecutionBackend(r.backend ?? params.executionBackend),
    skipWorktreeSetup: r.skipWorktreeSetup === true ? true : undefined,
    taskId,
    timeout: iterationTimeout,
    worktree: worktree !== '' ? worktree : undefined,
    worktreeBase: worktreeBase !== '' ? worktreeBase : undefined,
  };
}

/**
 * @description Builds {@link WorkflowContext} from a full {@link WorkflowContext}
 * (e.g. developer UI / argv preview). Applies task `iterations === 1` rule; keeps
 * {@link WorkflowContext.iterations} as the user-facing value.
 */
export function buildRalphFlowContextFromRunOptionsShape(
  input: WorkflowContext,
): WorkflowContext {
  const isTaskMode = input.mode === 'task';

  return {
    ...input,
    iterations: isTaskMode ? 1 : input.iterations,
    kind: 'ralph',
    mode: input.mode,
  };
}

/**
 * @description Resolves {@link WorkflowContext} from enqueue / job tuning plus plan scope.
 * Queued runs: pass `mode: 'plan'` and omit `taskId` so context matches BullMQ plan-scoped argv
 * (see `openthrottle-ralph-parity.ts` queue vs CLI notes).
 */
export function buildRalphFlowContextFromPlanRunTuning(params: {
  readonly executionBackend?: string | null;
  readonly mode?: WorkflowContext['mode'];
  readonly planId: string;
  readonly ralph?: RalphPlanRunTuningInput | null | undefined;
  readonly taskId?: string;
}): WorkflowContext {
  return buildRalphFlowContextFromRunOptionsShape(
    resolveWorkflowRunOptions(params),
  );
}
