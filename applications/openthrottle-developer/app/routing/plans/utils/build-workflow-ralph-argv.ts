/**
 * @description Builds `workflow-ralph` CLI segments aligned with `tools/workflows/src/utils/parsers.ts` (`parseRalphArgs`) and `pnpm exec workflow-ralph --help`. Omits flags when values match CLI defaults so invocations stay minimal.
 */

import type { RalphPlanRunTuningInput } from '~/__generated__/graphql';
import { RalphNestedDebugCli } from '~/__generated__/graphql';

/** RFC 4122 UUID v4 — matches `tools/workflows/src/utils/parsers.ts` plan/task validation. */
const CORTEX_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const WORKFLOW_RALPH_DEFAULT_BACKEND = 'cursor' as const;
export const WORKFLOW_RALPH_DEFAULT_PROMPT = '/agents/ralph' as const;
export const WORKFLOW_RALPH_DEFAULT_ITERATIONS = 10 as const;
export const WORKFLOW_RALPH_DEFAULT_MODEL = 'auto' as const;

export type WorkflowRalphTargetMode = 'plan' | 'task';

/**
 * @description Maps to `--debug` / `--verbose` / omit (env-only). Matches CLI precedence in parsers.
 */
export type WorkflowRalphDebugCli = 'omit' | 'debug' | 'verbose';

/**
 * @description Layer 2 — execution backend id; must stay aligned with `workflow-ralph --backend` / {@link WORKFLOW_RALPH_DEFAULT_BACKEND}.
 */
export type WorkflowRalphExecutionBackendUi =
  typeof WORKFLOW_RALPH_DEFAULT_BACKEND;

export interface WorkflowRalphRunOptionsInput {
  readonly debugCli: WorkflowRalphDebugCli;
  readonly executionBackend: WorkflowRalphExecutionBackendUi;
  readonly iterations: number;
  readonly iterationTimeoutSeconds: number | undefined;
  readonly model: string;
  readonly planId: string;
  readonly project: string;
  readonly prompt: string;
  readonly targetMode: WorkflowRalphTargetMode;
  readonly taskId: string;
}

/**
 * @description Returns true when `value` is a plausible Cortex plan/task UUID (v4).
 */
export const isCortexUuid = (value: string): boolean =>
  CORTEX_UUID_REGEX.test(value.trim());

/**
 * @description Initial form state; `planId` / `taskId` seed the run target when embedded on plan/task routes.
 */
export const getDefaultWorkflowRalphRunOptionsInput = (options?: {
  readonly planId?: string;
  readonly taskId?: string;
}): WorkflowRalphRunOptionsInput => {
  const planId = options?.planId?.trim() ?? '';
  const taskId = options?.taskId?.trim() ?? '';
  const targetMode: WorkflowRalphTargetMode =
    taskId !== '' && planId === '' ? 'task' : 'plan';

  return {
    debugCli: 'omit',
    executionBackend: 'cursor',
    iterationTimeoutSeconds: undefined,
    iterations: WORKFLOW_RALPH_DEFAULT_ITERATIONS,
    model: WORKFLOW_RALPH_DEFAULT_MODEL,
    planId,
    project: '',
    prompt: WORKFLOW_RALPH_DEFAULT_PROMPT,
    targetMode,
    taskId,
  };
};

/**
 * @description Builds argv segments after `workflow-ralph` (not including `pnpm exec workflow-ralph`). Flag names match CLI (`--iteration-timeout` in seconds, etc.).
 */
export const buildWorkflowRalphOptionArgs = (
  input: WorkflowRalphRunOptionsInput,
): readonly string[] => {
  const args: string[] = [];

  if (input.targetMode === 'plan') {
    args.push('--plan', input.planId.trim());
  } else {
    args.push('--task', input.taskId.trim());
  }

  if (input.executionBackend !== WORKFLOW_RALPH_DEFAULT_BACKEND) {
    args.push('--backend', input.executionBackend);
  }

  const prompt = input.prompt.trim();
  if (prompt !== WORKFLOW_RALPH_DEFAULT_PROMPT) {
    args.push('--prompt', prompt);
  }

  if (input.iterations !== WORKFLOW_RALPH_DEFAULT_ITERATIONS) {
    args.push('--iterations', String(input.iterations));
  }

  if (
    input.iterationTimeoutSeconds != null &&
    input.iterationTimeoutSeconds >= 1
  ) {
    args.push(
      '--iteration-timeout',
      String(Math.floor(input.iterationTimeoutSeconds)),
    );
  }

  const model = input.model.trim();
  if (model !== '' && model !== WORKFLOW_RALPH_DEFAULT_MODEL) {
    args.push('--model', model);
  }

  const project = input.project.trim();
  if (project !== '') {
    args.push('--project', project);
  }

  switch (input.debugCli) {
    case 'debug':
      args.push('--debug');
      break;
    case 'verbose':
      args.push('--verbose');
      break;
    case 'omit':
      break;
  }

  return args;
};

/**
 * @description Parses optional per-iteration timeout (seconds) for `--iteration-timeout`; empty string omits the flag.
 */
export const parseWorkflowRunIterationTimeoutSeconds = (
  raw: string,
): number | undefined => {
  const t = raw.trim();
  if (t === '') {
    return undefined;
  }
  const n = parseInt(t, 10);
  if (Number.isNaN(n) || n < 1) {
    return undefined;
  }
  return n;
};

/**
 * @description Maps workflow run options UI state to GraphQL {@link RalphPlanRunTuningInput} for `enqueuePlanRun`.
 * Queued BullMQ runs are always plan-scoped (the route’s plan id); `--task` / target mode in the panel affects the local CLI preview only, not enqueue.
 * Returns `undefined` when every field matches worktree/CLI defaults so the mutation can omit `ralph`.
 */
export const buildRalphPlanRunTuningInputFromWorkflowRunOptions = (
  input: WorkflowRalphRunOptionsInput,
): RalphPlanRunTuningInput | undefined => {
  const ralph: RalphPlanRunTuningInput = {};

  if (input.executionBackend !== WORKFLOW_RALPH_DEFAULT_BACKEND) {
    ralph.backend = input.executionBackend;
  }

  if (input.iterations !== WORKFLOW_RALPH_DEFAULT_ITERATIONS) {
    ralph.iterations = input.iterations;
  }

  if (
    input.iterationTimeoutSeconds != null &&
    input.iterationTimeoutSeconds >= 1
  ) {
    ralph.iterationTimeoutSeconds = Math.floor(input.iterationTimeoutSeconds);
  }

  const model = input.model.trim();
  if (model !== '' && model !== WORKFLOW_RALPH_DEFAULT_MODEL) {
    ralph.model = model;
  }

  const project = input.project.trim();
  if (project !== '') {
    ralph.project = project;
  }

  const prompt = input.prompt.trim();
  if (prompt !== WORKFLOW_RALPH_DEFAULT_PROMPT) {
    ralph.prompt = prompt;
  }

  switch (input.debugCli) {
    case 'debug':
      ralph.ralphDebugCli = RalphNestedDebugCli.Debug;
      break;
    case 'verbose':
      ralph.ralphDebugCli = RalphNestedDebugCli.Verbose;
      break;
    case 'omit':
      break;
  }

  if (Object.keys(ralph).length === 0) {
    return undefined;
  }

  return ralph;
};

/**
 * @description Single-line shell command for display/copy; quotes args when needed.
 */
export const formatWorkflowRalphCommandLine = (
  optionArgs: readonly string[],
): string => {
  const head = 'pnpm exec workflow-ralph';
  if (optionArgs.length === 0) {
    return head;
  }
  return `${head} ${optionArgs.map(quoteShellArg).join(' ')}`;
};

/**
 * @description Minimal POSIX-ish quoting for display; safe for typical Cortex UUIDs and paths.
 */
const quoteShellArg = (arg: string): string => {
  if (arg === '') {
    return `''`;
  }
  if (/[\s\\$`'"]/.test(arg)) {
    return `'${arg.replace(/'/g, `'\\''`)}'`;
  }
  return arg;
};
