/**
 * @description Builds {@link WorkflowContext} from GraphQL
 * `RalphPlanRunTuningInput` (enqueue / job tuning). Keeps Ralph argv-equivalent defaults aligned
 * with the workflow flow-context contract (`contract/flow-context`).
 */
import type { RalphPlanRunTuningInput } from '../__generated__/graphql.js';
import type { WorkflowContext } from '../types.js';
import {
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
} from '../contract/flow-context.js';

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

const resolveDebugFromTuning = (
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
 * {@link WorkflowContext}. Ignores `promptFile` — layer-1 argv only; not on {@link WorkflowContext}.
 */
export function resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning(params: {
  readonly planId: string;
  readonly ralph?: RalphPlanRunTuningInput | null | undefined;
  readonly mode?: WorkflowContext['mode'];
  readonly taskId?: string;
}): WorkflowContext {
  const r = params.ralph ?? {};
  const planId = params.planId.trim();
  const mode = params.mode ?? 'plan';
  const taskId = (params.taskId ?? '').trim();
  const iterations = resolveIterationsFromTuning(r.iterations);
  const iterationTimeout = resolveIterationTimeoutSecondsFromTuning(
    r.iterationTimeoutSeconds,
  );

  return {
    debug: resolveDebugFromTuning(r.ralphDebugCli),
    iterationMax: iterations,
    iterationTimeout,
    iterations,
    kind: 'ralph',
    mode,
    model: resolveModelFromTuning(r.model),
    planId,
    project: resolveProjectFromTuning(r.project),
    prompt: resolvePromptFromTuning(r.prompt),
    // runner: resolveExecutionBackend(r.backend),
    runner: 'RALPH',
    taskId,
    timeout: iterationTimeout,
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
  readonly planId: string;
  readonly ralph?: RalphPlanRunTuningInput | null | undefined;
  readonly mode?: WorkflowContext['mode'];
  readonly taskId?: string;
}): WorkflowContext {
  return buildRalphFlowContextFromRunOptionsShape(
    resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning(params),
  );
}
