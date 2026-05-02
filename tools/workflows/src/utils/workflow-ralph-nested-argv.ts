/**
 * @description Builds `workflow-ralph` argv segments for nested spawns (runChildJob, BullMQ processors)
 * so automated runs match CLI omission rules: omit flags when values equal defaults so
 * env and `.workflow-ralph.json` in the child cwd still apply (CLI > env > file > built-ins).
 */

import type { RalphExecutionBackendId } from './ralph-execution-backend';
import { DEFAULT_RALPH_RUNNER } from './ralph-execution-backend';
import {
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
} from './ralph-runtime-config';

/**
 * @description Maps to `--debug` / `--verbose` / omit (env-only); matches `workflow-ralph` CLI.
 */
export type RalphNestedDebugCli = 'omit' | 'debug' | 'verbose';

/**
 * @description Layer 1 (prompt profile), layer 2 (backend), and layer 3 (run tuning) for nested `pnpm exec workflow-ralph`.
 * All fields optional; omitted fields do not produce argv (defaults resolved in the child process).
 */
export interface RalphNestedRunTuningInput {
  readonly backend?: RalphExecutionBackendId | null;
  readonly debug?: RalphNestedDebugCli;
  readonly iterationTimeoutSeconds?: number | null;
  readonly iterations?: number | null;
  readonly model?: string;
  readonly project?: string;
  readonly prompt?: string;
  readonly promptFile?: string;
}

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
    input.backend !== DEFAULT_RALPH_RUNNER
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

  switch (input.debug) {
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

  return ralphArgs;
};
