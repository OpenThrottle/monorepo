/**
 * Child job: run the Ralph loop in a worktree, commit per task (agent responsibility),
 * complete the plan when all tasks are done, and return branch name and commit SHA for the parent.
 *
 * Thread-safety: All git and pnpm spawns use explicit path from handoff.worktreePath (git -C,
 * spawn cwd). No process.cwd() or shared path; safe for concurrent jobs when each has its own handoff.
 */

import { spawnSync } from 'child_process';
import { getCortexPostgresConfig } from '@openthrottle/ai-mcp/src/cortex-server';
import type { ChildJobInput, ChildJobResult } from '../types/worktree';
import {
  ensureCortexReachable,
  getTasksByPlanId,
  updatePlanStatus,
} from './cortex-client';
import type { CortexRalphConfig } from './cortex-client';

const WORKFLOW_RALPH_DEFAULT_PROMPT = '/agents/ralph' as const;
const WORKFLOW_RALPH_DEFAULT_MODEL = 'auto' as const;

/**
 * @description Appends workflow-ralph run-tuning argv (aligned with @tools/workflows runChildJob).
 */
function appendWorkflowRalphRunTuningArgs(
  ralphArgs: string[],
  input: Pick<
    ChildJobInput,
    'iterationTimeoutSeconds' | 'iterations' | 'model' | 'project' | 'prompt'
  >,
): void {
  if (input.iterations !== undefined && input.iterations !== null) {
    ralphArgs.push('--iterations', String(input.iterations));
  }

  const prompt = input.prompt?.trim();
  if (
    prompt !== undefined &&
    prompt !== '' &&
    prompt !== WORKFLOW_RALPH_DEFAULT_PROMPT
  ) {
    ralphArgs.push('--prompt', prompt);
  }

  const model = input.model?.trim();
  if (
    model !== undefined &&
    model !== '' &&
    model !== WORKFLOW_RALPH_DEFAULT_MODEL
  ) {
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
}

/**
 * @description Runs git in the worktree and returns stdout trimmed, or undefined on failure.
 */
function gitInWorktree(
  worktreePath: string,
  args: string[],
): string | undefined {
  const child = spawnSync('git', ['-C', worktreePath, ...args], {
    encoding: 'utf-8',
  });
  if (child.status !== 0) return undefined;
  return child.stdout?.trim();
}

/**
 * @description Runs the Ralph loop in the worktree (spawns workflow-ralph with cwd = worktree path),
 * then reads branch and HEAD commit SHA, and marks the plan COMPLETED if all tasks are done.
 * Returns branch name and commit SHA for the parent job to validate before releasing the target.
 */
export async function runChildJob(
  input: ChildJobInput,
): Promise<ChildJobResult> {
  const {
    handoff,
    iterationTimeoutSeconds,
    iterations,
    model,
    planId,
    project,
    prompt,
  } = input;
  const { worktreePath } = handoff;

  const rawConfig = getCortexPostgresConfig();
  if (!rawConfig) {
    return {
      ok: false,
      reason:
        'Cortex is required. Set CORTEX_POSTGRES_URL or CORTEX_POSTGRES_*.',
    };
  }

  const config: CortexRalphConfig = {
    connectionString: rawConfig.connectionString,
  };
  try {
    await ensureCortexReachable(config);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `Cortex unreachable: ${msg}` };
  }

  const ralphArgs = ['exec', 'workflow-ralph', '--plan', planId];
  appendWorkflowRalphRunTuningArgs(ralphArgs, {
    iterationTimeoutSeconds,
    iterations,
    model,
    project,
    prompt,
  });

  const ralph = spawnSync('pnpm', ralphArgs, {
    cwd: worktreePath,
    encoding: 'utf-8',
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  const stderr = ralph.stderr?.trim() ?? '';
  if (ralph.status !== 0) {
    return {
      ok: false,
      reason: `Ralph exited with code ${ralph.status ?? 'unknown'}`,
      stderr: stderr || undefined,
    };
  }

  const branchName = gitInWorktree(worktreePath, [
    'rev-parse',
    '--abbrev-ref',
    'HEAD',
  ]);
  const commitSha = gitInWorktree(worktreePath, ['rev-parse', 'HEAD']);

  if (!branchName || !commitSha) {
    return {
      ok: false,
      reason: 'Could not read branch or HEAD commit from worktree',
      stderr: stderr || undefined,
    };
  }

  const tasks = await getTasksByPlanId(config, planId);
  const allDone =
    tasks.length > 0 &&
    tasks.every((t) => t.status === 'COMPLETED' || t.status === 'SKIPPED');
  if (allDone) {
    await updatePlanStatus(config, planId, 'COMPLETED');
  }

  return {
    branchName,
    commitSha,
    ok: true,
    planCompleted: allDone,
  };
}
