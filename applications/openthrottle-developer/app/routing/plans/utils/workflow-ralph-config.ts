/**
 * @description Shared `workflow-ralph` vocabulary for the plan/task run-config UI:
 * CLI-aligned constants (defaults, known backends, env var names, precedence),
 * the run-options state shape + supporting union types, and the small pure
 * helpers that seed/parse that state (`isUuid`, iteration-timeout parsing, the
 * default + diff-baseline factories). Kept dependency-free so the argv builder,
 * tuning mapper, validator, and diff labeller can all build on it.
 *
 * Aligned with `tools/workflows/src/utils/parsers.ts` and
 * `pnpm exec workflow-ralph --help`.
 */

import {
  DEFAULT_PLAN_RUN_RALPH_DEBUG_CLI,
  DEFAULT_PLAN_RUN_RALPH_ITERATIONS,
  DEFAULT_PLAN_RUN_RALPH_MODEL,
  DEFAULT_PLAN_RUN_RALPH_PROMPT,
  DEFAULT_PLAN_RUN_RALPH_RUNNER,
  DEFAULT_PLAN_RUN_RALPH_WORKTREE_CLI,
} from '@openthrottle/openthrottle-plan-config';

/** RFC 4122 UUID v4 — matches `tools/workflows/src/utils/parsers.ts` plan/task validation. */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// One source of truth with the server and `plans.run_config`: these alias the shared
// `@openthrottle/openthrottle-plan-config` defaults rather than restating them, so the Configuration
// tab cannot drift from what a queued run actually gets.
export const DEFAULT_RALPH_RUNNER = DEFAULT_PLAN_RUN_RALPH_RUNNER;
export const DEFAULT_RALPH_PROMPT = DEFAULT_PLAN_RUN_RALPH_PROMPT;
export const DEFAULT_RALPH_ITERATIONS = DEFAULT_PLAN_RUN_RALPH_ITERATIONS;
export const DEFAULT_RALPH_MODEL = DEFAULT_PLAN_RUN_RALPH_MODEL;

/**
 * @description Same ids as the `openthrottle-drivers` `DRIVER_IDS` set (surfaced via
 * `WORKFLOW_RUNNER_IDS`). Hand-maintained here because this is browser code and must NOT import the
 * Node-only drivers package; keep it aligned with `workflow-ralph --backend` when a driver is added.
 */
export const WORKFLOW_RALPH_KNOWN_BACKENDS = [
  'claude',
  'codex',
  'cursor',
  'grok',
  'opencode',
] as const;

/**
 * @description Short label for plan-run history and queue job detail (`cursor` | `claude` from the API).
 */
export const formatWorkflowRalphExecutionBackendLabel = (
  backend: string | null | undefined,
): string => {
  if (backend === 'claude') {
    return 'Claude Code CLI';
  }
  if (backend === 'cursor') {
    return 'Cursor (cursor-agent)';
  }
  if (backend == null || backend === '') {
    return '—';
  }
  return backend;
};

/**
 * @description Default precedence for resolving Ralph prompt + run tuning (matches CLI help and
 * {@link WORKFLOW_RALPH_CONFIG_PRECEDENCE} in `@tools/workflows`).
 */
export const WORKFLOW_RALPH_CONFIG_PRECEDENCE =
  'CLI flags → environment variables → .workflow-ralph.json → built-in defaults' as const;

/** @deprecated Use {@link WORKFLOW_RALPH_CONFIG_PRECEDENCE}. */
export const WORKFLOW_RALPH_DEFAULT_PRECEDENCE =
  WORKFLOW_RALPH_CONFIG_PRECEDENCE;

/**
 * @description Env vars for run tuning and layer-1 prompt (matches {@link WORKFLOW_RALPH_CONFIG_PRECEDENCE}
 * and `tools/workflows/src/utils/ralph-runtime-config.ts` {@link WORKFLOW_RALPH_ENV}).
 */
export const WORKFLOW_RALPH_ENV_VARS = {
  backend: 'WORKFLOW_RALPH_BACKEND',
  debug: 'WORKFLOW_RALPH_DEBUG',
  debugAlias: 'RALPH_DEBUG',
  iterationTimeout: 'WORKFLOW_RALPH_ITERATION_TIMEOUT',
  iterations: 'WORKFLOW_RALPH_ITERATIONS',
  lifecycleHooksChildJobs: 'OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS',
  model: 'WORKFLOW_RALPH_MODEL',
  project: 'WORKFLOW_RALPH_PROJECT',
  prompt: 'WORKFLOW_RALPH_PROMPT',
  promptFile: 'WORKFLOW_RALPH_PROMPT_FILE',
  skipWorktreeSetup: 'WORKFLOW_RALPH_SKIP_WORKTREE_SETUP',
  spawnOtRoot: 'WORKFLOW_RALPH_OT_ROOT',
  verbose: 'WORKFLOW_RALPH_VERBOSE',
  worktree: 'WORKFLOW_RALPH_WORKTREE',
  worktreeBase: 'WORKFLOW_RALPH_WORKTREE_BASE',
} as const;

/**
 * @description Sentinel for `--worktree` with no name; aligned with `RALPH_WORKTREE_FLAG_ONLY` in `tools/workflows`.
 */
export const WORKFLOW_RALPH_WORKTREE_FLAG_ONLY = '' as const;

/**
 * @description BullMQ queue name for plan Ralph jobs (`run-plan`, orchestrator). Same as the server `PLANS_QUEUE_NAME` constant.
 */
export const PLAN_RUN_BULLMQ_QUEUE_NAME = 'Plans' as const;

export type WorkflowRalphTargetMode = 'plan' | 'task';

/**
 * @description Layer 1 prompt delivery: `--prompt` vs `--prompt-file` (mutually exclusive in `parseRalphArgs`).
 */
export type WorkflowRalphPromptLayer = 'named' | 'file';

/**
 * @description Maps to `--debug` / `--verbose` / omit (env-only). Matches CLI precedence in parsers.
 */
export type WorkflowRalphDebugCli = 'omit' | 'debug' | 'verbose';

/**
 * @description Agent CLI `--worktree` mode: omit (BullMQ may default to acquired target id), flag-only, or named.
 */
export type WorkflowRalphWorktreeCli = 'flag-only' | 'named' | 'omit';

/**
 * @description Layer 2 — execution backend id; must stay aligned with `workflow-ralph --backend` / {@link WORKFLOW_RALPH_KNOWN_BACKENDS}.
 */
export type WorkflowRalphExecutionBackendUi =
  (typeof WORKFLOW_RALPH_KNOWN_BACKENDS)[number];

export interface WorkflowRalphRunOptionsInput {
  readonly debugCli: WorkflowRalphDebugCli;
  readonly executionBackend: WorkflowRalphExecutionBackendUi;
  readonly iterationTimeoutSeconds: number | undefined;
  readonly iterations: number;
  readonly model: string;
  readonly planId: string;
  readonly project: string;
  readonly prompt: string;
  /** @description Repo-relative or absolute path for `--prompt-file` when {@link promptLayer} is `file`. */
  readonly promptFile: string;
  /** @description `--prompt` (named profile) vs `--prompt-file` — matches CLI mutual exclusion. */
  readonly promptLayer: WorkflowRalphPromptLayer;
  /** @description Cursor-only: `--skip-worktree-setup`. */
  readonly skipWorktreeSetup: boolean;
  readonly targetMode: WorkflowRalphTargetMode;
  readonly taskId: string;
  /** @description Cursor-only: `--worktree-base`. */
  readonly worktreeBase: string;
  /** @description Agent CLI worktree: omit, `--worktree` only, or `--worktree <name>`. */
  readonly worktreeCli: WorkflowRalphWorktreeCli;
  readonly worktreeName: string;
}

/**
 * @description Returns true when `value` is a plausible plan/task UUID (v4).
 */
export const isUuid = (value: string): boolean => {
  return UUID_REGEX.test(value.trim());
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
    debugCli: DEFAULT_PLAN_RUN_RALPH_DEBUG_CLI,
    executionBackend: DEFAULT_RALPH_RUNNER,
    iterationTimeoutSeconds: undefined,
    iterations: DEFAULT_RALPH_ITERATIONS,
    model: DEFAULT_RALPH_MODEL,
    planId,
    project: '',
    prompt: DEFAULT_RALPH_PROMPT,
    promptFile: '',
    promptLayer: 'named',
    skipWorktreeSetup: false,
    targetMode,
    taskId,
    worktreeBase: '',
    worktreeCli: DEFAULT_PLAN_RUN_RALPH_WORKTREE_CLI,
    // Blank means "derive plan-<short plan id> at enqueue", not "no worktree".
    worktreeName: '',
  };
};

/**
 * @description Baseline tuning for “diff vs defaults” on the plan/task route: same
 * `--plan` / `--task` target as {@link input}, with every other field reset like
 * {@link getDefaultWorkflowRalphRunOptionsInput}.
 */
export const getWorkflowRalphUiBaselineForDiff = (
  input: WorkflowRalphRunOptionsInput,
): WorkflowRalphRunOptionsInput => {
  const seeded = getDefaultWorkflowRalphRunOptionsInput({
    planId: input.planId,
    taskId: input.taskId,
  });

  return {
    ...seeded,
    planId: input.planId,
    targetMode: input.targetMode,
    taskId: input.taskId,
  };
};
