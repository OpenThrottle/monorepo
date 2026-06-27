/**
 * Child job: run the Ralph loop in a worktree, commit per task (agent responsibility),
 * complete the plan when all tasks are done, and return branch name and commit SHA for the parent.
 *
 * Thread-safety: All git and pnpm spawns use explicit path from handoff.worktreePath (git -C,
 * spawn cwd). No process.cwd() or shared path; safe for concurrent jobs when each has its own handoff.
 */

import { buildWorkflowRalphRunTuningArgv } from '@tools/workflows';
import {
  ensureCortexReachable,
  getTasksByPlanId,
  updatePlanStatus,
} from './cortex-client';
import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import { spawnSync } from 'child_process';
import type { ChildJobInput, ChildJobResult } from '../types/worktree';
import type { CortexRalphConfig } from './cortex-client';

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
    backend,
    debug,
    handoff,
    iterations,
    iterationTimeoutSeconds,
    model,
    planId,
    project,
    prompt,
    promptFile,
  } = input;
  const { worktreePath } = handoff;

  let connectionString: string;

  try {
    connectionString = getPostgresUrl();
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);

    return {
      ok: false,
      reason: message,
    };
  }

  const config: CortexRalphConfig = { connectionString };

  try {
    await ensureCortexReachable(config);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      reason: `OpenThrottle Postgres is unreachable: ${msg}`,
    };
  }

  const ralphArgs = [
    'exec',
    'workflow-ralph',
    '--plan',
    planId,
    ...buildWorkflowRalphRunTuningArgv({
      backend,
      debug,
      iterationTimeoutSeconds,
      iterations,
      model,
      project,
      prompt,
      promptFile,
    }),
  ];

  // SECURITY: never pass `shell: true` here. With a shell, Node joins argv into a
  // single string run through `/bin/sh -c`, so shell metacharacters in any
  // caller-controlled arg (planId, prompt, promptFile, project, model) would be
  // interpreted — arbitrary command execution on the worker host. Passing the args
  // array directly (no shell) makes each element a literal argv entry to `pnpm`.
  const ralph = spawnSync('pnpm', ralphArgs, {
    cwd: worktreePath,
    encoding: 'utf-8',
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

  const commitSha = gitInWorktree(worktreePath, ['rev-parse', 'HEAD']);
  const branchName = gitInWorktree(worktreePath, [
    'rev-parse',
    '--abbrev-ref',
    'HEAD',
  ]);

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
