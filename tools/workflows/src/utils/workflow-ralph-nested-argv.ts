/**
 * @description Builds `workflow-ralph` argv segments for nested spawns (runChildJob, BullMQ processors)
 * so automated runs match CLI omission rules: omit flags when values equal defaults so
 * env and `.workflow-ralph.json` in the child cwd still apply (CLI > env > file > built-ins).
 */

import type {
  WorkflowConfigDebug,
  WorkflowConfigRunner,
} from '@openthrottle/openthrottle-agentic-workflow';
import {
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
} from './ralph-runtime-config';
import {
  buildWorktreeNestedArgv,
  type RalphWorktreeName,
} from './ralph-worktree-cli';

/**
 * @description Layer 1 (prompt profile), layer 2 (backend), and layer 3 (run tuning) for nested `pnpm exec workflow-ralph`.
 * All fields optional; omitted fields do not produce argv (defaults resolved in the child process).
 */
export interface RalphNestedRunTuningInput {
  /**
   * Execution backend id ({@link WorkflowConfigRunner}: `cursor` or `claude`). Selection applies
   * to the **entire** nested run; not switched per iteration. Omit (or pass the default) to let the
   * child resolve from env / `.workflow-ralph.json`.
   */
  readonly backend?: WorkflowConfigRunner | null;
  readonly debug?: WorkflowConfigDebug;
  readonly iterationTimeoutSeconds?: number | null;
  readonly iterations?: number | null;
  readonly model?: string;
  readonly project?: string;
  readonly prompt?: string;
  readonly promptFile?: string;
  /** Cursor-only: `--skip-worktree-setup`. */
  readonly skipWorktreeSetup?: boolean | null;
  /** Agent CLI worktree name; forwarded as `--worktree` / `--worktree <name>`. */
  readonly worktree?: RalphWorktreeName | null;
  /** Cursor-only: `--worktree-base`. */
  readonly worktreeBase?: string | null;
}

/**
 * @description Normalizes legacy uppercase debug values (e.g. persisted `DEBUG` / `VERBOSE`)
 * to the canonical lowercase {@link WorkflowConfigDebug} union so argv and merge output stay consistent.
 */
const normalizeWorkflowConfigDebug = (
  debug: WorkflowConfigDebug | undefined,
): WorkflowConfigDebug | undefined => {
  if (debug === undefined) {
    return undefined;
  }

  const lowered = String(debug).toLowerCase();
  if (lowered === 'debug' || lowered === 'omit' || lowered === 'verbose') {
    return lowered;
  }

  return debug;
};

/**
 * @description Returns argv segments after `--plan <uuid>` (or `--task`) for nested workflow-ralph invocations.
 */
export const buildWorkflowRalphRunTuningArgv = (
  input: RalphNestedRunTuningInput,
): string[] => {
  const ralphArgs: string[] = [];

  if (input.iterations !== undefined && input.iterations !== null) {
    ralphArgs.push('--iterations', String(input.iterations));
  }

  if (
    input.backend !== undefined &&
    input.backend !== null &&
    input.backend !== 'cursor'
  ) {
    ralphArgs.push('--backend', input.backend);
  }

  const promptFile = input.promptFile?.trim();
  if (promptFile !== undefined && promptFile !== '') {
    ralphArgs.push('--prompt-file', promptFile);
  } else {
    const prompt = input.prompt?.trim();
    if (
      prompt !== undefined &&
      prompt !== '' &&
      prompt !== DEFAULT_RALPH_PROMPT
    ) {
      ralphArgs.push('--prompt', prompt);
    }
  }

  const model = input.model?.trim();
  if (model !== undefined && model !== '' && model !== DEFAULT_RALPH_MODEL) {
    ralphArgs.push('--model', model);
  }

  const project = input.project?.trim();
  if (project !== undefined && project !== '') {
    ralphArgs.push('--project', project);
  }

  if (
    input.iterationTimeoutSeconds !== undefined &&
    input.iterationTimeoutSeconds !== null &&
    input.iterationTimeoutSeconds >= 1
  ) {
    ralphArgs.push(
      '--iteration-timeout',
      String(Math.floor(input.iterationTimeoutSeconds)),
    );
  }

  switch (normalizeWorkflowConfigDebug(input.debug)) {
    case 'debug':
      ralphArgs.push('--debug');
      break;

    case 'verbose':
      ralphArgs.push('--verbose');
      break;

    case 'omit':
    default:
      break;
  }

  const worktree =
    input.worktree === null || input.worktree === undefined
      ? undefined
      : input.worktree;

  ralphArgs.push(
    ...buildWorktreeNestedArgv(worktree, {
      skipWorktreeSetup: input.skipWorktreeSetup === true,
      worktreeBase:
        input.worktreeBase === null || input.worktreeBase === undefined
          ? undefined
          : input.worktreeBase,
    }),
  );

  return ralphArgs;
};

/**
 * @description Fills `backend` from the BullMQ job’s persisted {@link executionBackend} when tuning
 * omits `backend`, so nested argv and in-process orchestrator resolve the same runner for the whole run.
 */
export const mergeRalphNestedRunTuningWithExecutionBackend = (
  ralph: RalphNestedRunTuningInput | undefined,
  executionBackend: WorkflowConfigRunner | undefined,
): RalphNestedRunTuningInput => {
  const base = ralph ?? {};

  const hasBackend = base.backend != null;
  const backend = hasBackend ? base.backend : (executionBackend ?? 'cursor');
  const debug = normalizeWorkflowConfigDebug(base.debug);

  return {
    ...base,
    backend,
    ...(debug !== undefined ? { debug } : {}),
  };
};
