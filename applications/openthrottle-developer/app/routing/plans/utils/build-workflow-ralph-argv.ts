/**
 * @description Builds `workflow-ralph` CLI segments aligned with `tools/workflows/src/utils/parsers.ts` (`parseRalphArgs`) and `pnpm exec workflow-ralph --help`. Omits flags when values match CLI defaults so invocations stay minimal.
 */

import type { RalphPlanRunTuningInput } from '~/__generated__/graphql';
import { RalphNestedDebugCli } from '~/__generated__/graphql';
import { RalphPlanRunTuningInputSchema } from '~/__generated__/schemas';

/** RFC 4122 UUID v4 — matches `tools/workflows/src/utils/parsers.ts` plan/task validation. */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DEFAULT_RALPH_RUNNER = 'cursor';
export const DEFAULT_RALPH_PROMPT = '/agents/ralph';
export const DEFAULT_RALPH_ITERATIONS = 10;
export const DEFAULT_RALPH_MODEL = 'auto';

/**
 * @description Same ids as `tools/workflows/src/utils/ralph-execution-backend.ts`
 * (`RALPH_EXECUTION_BACKEND_IDS`). UI layer-2 must stay aligned with `workflow-ralph --backend`.
 */
export const WORKFLOW_RALPH_KNOWN_BACKENDS = ['cursor'] as const;

/**
 * @description Default precedence for resolving Ralph prompt + run tuning (matches CLI help).
 */
export const WORKFLOW_RALPH_DEFAULT_PRECEDENCE =
  'CLI flags → WORKFLOW_RALPH_* / RALPH_* env → .workflow-ralph.json → built-in defaults';

/**
 * @description Env vars for run tuning and layer-1 prompt (matches {@link WORKFLOW_RALPH_DEFAULT_PRECEDENCE}
 * and `tools/workflows/src/utils/ralph-runtime-config.ts` {@link WORKFLOW_RALPH_ENV}).
 */
export const WORKFLOW_RALPH_ENV_VARS = {
  backend: 'WORKFLOW_RALPH_BACKEND',
  debug: 'WORKFLOW_RALPH_DEBUG',
  debugAlias: 'RALPH_DEBUG',
  iterationTimeout: 'WORKFLOW_RALPH_ITERATION_TIMEOUT',
  iterations: 'WORKFLOW_RALPH_ITERATIONS',
  model: 'WORKFLOW_RALPH_MODEL',
  project: 'WORKFLOW_RALPH_PROJECT',
  prompt: 'WORKFLOW_RALPH_PROMPT',
  promptFile: 'WORKFLOW_RALPH_PROMPT_FILE',
  verbose: 'WORKFLOW_RALPH_VERBOSE',
} as const;

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
 * @description Layer 2 — execution backend id; must stay aligned with `workflow-ralph --backend` / {@link DEFAULT_RALPH_RUNNER}.
 */
export type WorkflowRalphExecutionBackendUi = typeof DEFAULT_RALPH_RUNNER;

export interface WorkflowRalphRunOptionsInput {
  readonly debugCli: WorkflowRalphDebugCli;
  readonly executionBackend: WorkflowRalphExecutionBackendUi;
  readonly iterations: number;
  readonly iterationTimeoutSeconds: number | undefined;
  readonly model: string;
  readonly planId: string;
  readonly project: string;
  readonly prompt: string;
  /** @description Repo-relative or absolute path for `--prompt-file` when {@link promptLayer} is `file`. */
  readonly promptFile: string;
  /** @description `--prompt` (named profile) vs `--prompt-file` — matches CLI mutual exclusion. */
  readonly promptLayer: WorkflowRalphPromptLayer;
  readonly targetMode: WorkflowRalphTargetMode;
  readonly taskId: string;
}

/**
 * @description Returns true when `value` is a plausible plan/task UUID (v4).
 */
export const isUuid = (value: string): boolean => {
  return UUID_REGEX.test(value.trim());
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
    debugCli: 'omit',
    executionBackend: 'cursor',
    iterationTimeoutSeconds: undefined,
    iterations: DEFAULT_RALPH_ITERATIONS,
    model: DEFAULT_RALPH_MODEL,
    planId,
    project: '',
    prompt: DEFAULT_RALPH_PROMPT,
    promptFile: '',
    promptLayer: 'named',
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

  if (input.executionBackend !== DEFAULT_RALPH_RUNNER) {
    args.push('--backend', input.executionBackend);
  }

  if (input.promptLayer === 'file') {
    const promptFile = input.promptFile.trim();
    if (promptFile !== '') {
      args.push('--prompt-file', promptFile);
    }
  } else {
    const prompt = input.prompt.trim();
    if (prompt !== '' && prompt !== DEFAULT_RALPH_PROMPT) {
      args.push('--prompt', prompt);
    }
  }

  if (input.iterations !== DEFAULT_RALPH_ITERATIONS) {
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
  if (model !== '' && model !== DEFAULT_RALPH_MODEL) {
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
 * @description One validation issue; messages mirror `tools/workflows/src/utils/parsers.ts` where applicable.
 */
export interface WorkflowRalphValidationIssue {
  readonly code: string;
  readonly message: string;
}

/**
 * @description Options for {@link validateWorkflowRalphRunOptionsState}. When `requireCliTargetIds` is
 * false, `--plan` / `--task` id rules are skipped (e.g. Configuration panel without a route-seeded id).
 */
export interface ValidateWorkflowRalphRunOptionsStateOptions {
  readonly requireCliTargetIds?: boolean;
}

/**
 * @description Merges UI state the same way as the plan route and CLI preview, then validates targets,
 * `--iterations`, optional `--iteration-timeout` text, backend id, and optional enqueue tuning shape
 * (`RalphPlanRunTuningInputSchema` + CLI-aligned refinements).
 */
export const validateWorkflowRalphRunOptionsState = (
  input: WorkflowRalphRunOptionsInput,
  iterationTimeoutText: string,
  options?: ValidateWorkflowRalphRunOptionsStateOptions,
):
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly issues: readonly WorkflowRalphValidationIssue[];
    } => {
  const requireCliTargetIds = options?.requireCliTargetIds === true;
  const issues: WorkflowRalphValidationIssue[] = [];

  const timeoutRaw = iterationTimeoutText.trim();
  if (timeoutRaw !== '') {
    const n = Number.parseInt(timeoutRaw, 10);
    if (Number.isNaN(n) || n < 1) {
      issues.push({
        code: 'iteration_timeout',
        message: '--iteration-timeout must be a positive integer (seconds)',
      });
    }
  }

  if (!Number.isFinite(input.iterations) || input.iterations < 1) {
    issues.push({
      code: 'iterations',
      message: '--iterations must be a positive integer greater than 0',
    });
  }

  const backend = input.executionBackend.trim().toLowerCase();
  if (!(WORKFLOW_RALPH_KNOWN_BACKENDS as readonly string[]).includes(backend)) {
    issues.push({
      code: 'backend',
      message: `Unknown execution backend "${input.executionBackend.trim()}". Supported: ${WORKFLOW_RALPH_KNOWN_BACKENDS.join(', ')}`,
    });
  }

  /**
   * @description Same mutual-exclusion rules as `tools/workflows/src/utils/parsers.ts` after argv (`--prompt` vs `--prompt-file`).
   */
  if (input.promptLayer === 'named' && input.promptFile.trim() !== '') {
    issues.push({
      code: 'prompt_conflict',
      message: '--prompt-file cannot be combined with --prompt',
    });
  }
  if (input.promptLayer === 'file') {
    const named = input.prompt.trim();
    if (named !== '' && named !== DEFAULT_RALPH_PROMPT) {
      issues.push({
        code: 'prompt_conflict',
        message: '--prompt-file cannot be combined with --prompt',
      });
    }
  }

  if (requireCliTargetIds) {
    if (input.targetMode === 'plan') {
      const plan = input.planId.trim();
      if (plan === '') {
        issues.push({
          code: 'plan_required',
          message: '--plan requires a Cortex plan UUID',
        });
      } else if (!isUuid(plan)) {
        issues.push({
          code: 'plan_uuid',
          message:
            'Plan must be a Cortex plan UUID (v4). Example: 77cb14a0-5eb0-4061-87ea-d618b85e8818',
        });
      }
    } else {
      const task = input.taskId.trim();
      if (task === '') {
        issues.push({
          code: 'task_required',
          message: '--task requires a Cortex task UUID',
        });
      } else if (!isUuid(task)) {
        issues.push({
          code: 'task_uuid',
          message:
            'Task must be a Cortex task UUID (v4). Example: 45a30762-92a9-42f4-90e0-2437c7ef26a8',
        });
      }
    }
  } else {
    if (input.targetMode === 'plan') {
      const plan = input.planId.trim();
      if (plan !== '' && !isUuid(plan)) {
        issues.push({
          code: 'plan_uuid',
          message:
            'Plan must be a Cortex plan UUID (v4). Example: 77cb14a0-5eb0-4061-87ea-d618b85e8818',
        });
      }
    } else {
      const task = input.taskId.trim();
      if (task !== '' && !isUuid(task)) {
        issues.push({
          code: 'task_uuid',
          message:
            'Task must be a Cortex task UUID (v4). Example: 45a30762-92a9-42f4-90e0-2437c7ef26a8',
        });
      }
    }
  }

  const merged: WorkflowRalphRunOptionsInput = {
    ...input,
    iterationTimeoutSeconds:
      parseWorkflowRunIterationTimeoutSeconds(iterationTimeoutText),
  };

  const tuning = buildRalphPlanRunTuningInputFromWorkflowRunOptions(merged);
  if (tuning !== undefined) {
    const parsed = RalphPlanRunTuningInputSchema().safeParse(tuning);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const formErrors = flat.formErrors;
      for (const msg of formErrors) {
        issues.push({ code: 'enqueue_tuning_schema', message: msg });
      }

      const fieldErrors = flat.fieldErrors;
      for (const [key, msgs] of Object.entries(fieldErrors)) {
        if (msgs != null) {
          for (const m of msgs) {
            issues.push({
              code: `enqueue_tuning_${key}`,
              message: m,
            });
          }
        }
      }
    } else {
      const data = parsed.data;
      if (
        data.iterations != null &&
        (!Number.isFinite(data.iterations) || data.iterations < 1)
      ) {
        issues.push({
          code: 'enqueue_iterations',
          message:
            'Nested Ralph tuning: iterations must be a positive integer (parity with CLI)',
        });
      }

      if (
        data.iterationTimeoutSeconds != null &&
        (!Number.isFinite(data.iterationTimeoutSeconds) ||
          data.iterationTimeoutSeconds < 1)
      ) {
        issues.push({
          code: 'enqueue_iteration_timeout',
          message:
            'Nested Ralph tuning: iterationTimeoutSeconds must be a positive integer (parity with CLI)',
        });
      }
    }
  }

  if (issues.length === 0) {
    return { ok: true };
  }

  return { issues, ok: false };
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

  if (input.executionBackend !== DEFAULT_RALPH_RUNNER) {
    ralph.backend = input.executionBackend;
  }

  if (input.iterations !== DEFAULT_RALPH_ITERATIONS) {
    ralph.iterations = input.iterations;
  }

  if (
    input.iterationTimeoutSeconds != null &&
    input.iterationTimeoutSeconds >= 1
  ) {
    ralph.iterationTimeoutSeconds = Math.floor(input.iterationTimeoutSeconds);
  }

  const model = input.model.trim();
  if (model !== '' && model !== DEFAULT_RALPH_MODEL) {
    ralph.model = model;
  }

  const project = input.project.trim();
  if (project !== '') {
    ralph.project = project;
  }

  if (input.promptLayer === 'file') {
    const path = input.promptFile.trim();
    if (path !== '') {
      ralph.promptFile = path;
    }
  } else {
    const prompt = input.prompt.trim();
    if (prompt !== '' && prompt !== DEFAULT_RALPH_PROMPT) {
      ralph.prompt = prompt;
    }
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

export interface WorkflowRalphDebugBundleInput {
  readonly iterationTimeoutText: string;
  readonly planId: string;
  readonly workflowInput: WorkflowRalphRunOptionsInput;
}

/**
 * @description JSON bundle for support: plan id, CLI preview target, canonical argv line, optional enqueue tuning object, and queue metadata. Omits secrets.
 */
export const buildWorkflowRalphDebugBundleText = (
  input: WorkflowRalphDebugBundleInput,
): string => {
  const merged: WorkflowRalphRunOptionsInput = {
    ...input.workflowInput,
    iterationTimeoutSeconds: parseWorkflowRunIterationTimeoutSeconds(
      input.iterationTimeoutText,
    ),
  };

  const optionArgs = buildWorkflowRalphOptionArgs(merged);
  const canonicalCommand = formatWorkflowRalphCommandLine(optionArgs);
  const enqueueTuning =
    buildRalphPlanRunTuningInputFromWorkflowRunOptions(merged);

  const payload = {
    canonicalCommand,
    cliPreview: {
      note: 'Matches Configuration → Canonical CLI. Toolbar enqueue uses enqueueRalphTuning only (plan-scoped); --task in preview is for local CLI.',
      targetMode: merged.targetMode,
    },
    docs: {
      cliHelp: 'pnpm exec workflow-ralph --help',
      monorepoReadme: 'tools/workflows/README.md',
    },
    enqueueRalphTuning: enqueueTuning ?? null,
    planId: input.planId,
    queue: {
      jobListPath: `/queues/${PLAN_RUN_BULLMQ_QUEUE_NAME}`,
      name: PLAN_RUN_BULLMQ_QUEUE_NAME,
    },
    taskId:
      merged.targetMode === 'task' && merged.taskId.trim() !== ''
        ? merged.taskId.trim()
        : undefined,
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
};

/**
 * @description Path to the queue job detail route for a plan-run job id.
 */
export const planRunJobDetailPath = (jobId: string): string => {
  const q = encodeURIComponent(PLAN_RUN_BULLMQ_QUEUE_NAME);
  const j = encodeURIComponent(jobId.trim());

  return `/queues/${q}/${j}`;
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
