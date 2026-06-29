/**
 * @description Human-readable lines describing how the current `workflow-ralph`
 * run options differ from the UI baseline (Configuration → Reset to defaults),
 * used by the run-transparency panel. Empty when argv matches the minimal flags
 * for the same target.
 */

import {
  DEFAULT_RALPH_MODEL,
  getWorkflowRalphUiBaselineForDiff,
  parseWorkflowRunIterationTimeoutSeconds,
  type WorkflowRalphRunOptionsInput,
} from './workflow-ralph-config';

/**
 * @description Human-readable lines describing how the current workflow options differ
 * from the UI baseline (Configuration → Reset to defaults). Empty when argv matches
 * minimal flags for the same target.
 */
export const buildWorkflowRalphTuningDiffLabels = (
  input: WorkflowRalphRunOptionsInput,
  iterationTimeoutText: string,
): readonly string[] => {
  const ref = getWorkflowRalphUiBaselineForDiff(input);
  const cur: WorkflowRalphRunOptionsInput = {
    ...input,
    iterationTimeoutSeconds:
      parseWorkflowRunIterationTimeoutSeconds(iterationTimeoutText),
  };
  const refMerged: WorkflowRalphRunOptionsInput = {
    ...ref,
    iterationTimeoutSeconds: undefined,
  };

  const lines: string[] = [];

  if (cur.executionBackend !== refMerged.executionBackend) {
    lines.push(
      `Backend: ${refMerged.executionBackend} → ${cur.executionBackend} (--backend)`,
    );
  }

  if (cur.iterations !== refMerged.iterations) {
    lines.push(
      `Iterations: ${refMerged.iterations} → ${cur.iterations} (--iterations)`,
    );
  }

  const curTimeout = cur.iterationTimeoutSeconds;
  const refTimeout = refMerged.iterationTimeoutSeconds;
  if (curTimeout !== refTimeout) {
    lines.push(
      `Iteration timeout (seconds): ${
        refTimeout == null ? 'omit' : String(refTimeout)
      } → ${curTimeout == null ? 'omit' : String(curTimeout)} (--iteration-timeout)`,
    );
  }

  const curModel = cur.model.trim();
  const refModel = refMerged.model.trim();
  if (curModel !== refModel) {
    lines.push(
      `Model: ${refModel === '' ? DEFAULT_RALPH_MODEL : refModel} → ${
        curModel === '' ? DEFAULT_RALPH_MODEL : curModel
      } (--model)`,
    );
  }

  if (cur.project.trim() !== refMerged.project.trim()) {
    lines.push(
      `Nx project: ${
        refMerged.project.trim() === '' ? 'omit' : refMerged.project.trim()
      } → ${
        cur.project.trim() === '' ? 'omit' : cur.project.trim()
      } (--project)`,
    );
  }

  const promptChanged =
    cur.promptLayer !== refMerged.promptLayer ||
    cur.prompt.trim() !== refMerged.prompt.trim() ||
    cur.promptFile.trim() !== refMerged.promptFile.trim();

  if (promptChanged) {
    lines.push(
      'Prompt delivery differs from baseline (--prompt vs --prompt-file; see Configuration).',
    );
  }

  if (cur.debugCli !== refMerged.debugCli) {
    lines.push(
      `Debug CLI: ${refMerged.debugCli} → ${cur.debugCli} (--debug / --verbose)`,
    );
  }

  if (cur.worktreeCli !== refMerged.worktreeCli) {
    lines.push(
      `Agent worktree: ${refMerged.worktreeCli} → ${cur.worktreeCli} (--worktree)`,
    );
  } else if (
    cur.worktreeCli === 'named' &&
    cur.worktreeName.trim() !== refMerged.worktreeName.trim()
  ) {
    lines.push(
      `Agent worktree name: ${
        refMerged.worktreeName.trim() === ''
          ? 'omit'
          : refMerged.worktreeName.trim()
      } → ${cur.worktreeName.trim()} (--worktree)`,
    );
  }

  if (cur.worktreeBase.trim() !== refMerged.worktreeBase.trim()) {
    lines.push(
      `Worktree base: ${
        refMerged.worktreeBase.trim() === ''
          ? 'omit'
          : refMerged.worktreeBase.trim()
      } → ${
        cur.worktreeBase.trim() === '' ? 'omit' : cur.worktreeBase.trim()
      } (--worktree-base, Cursor only)`,
    );
  }

  if (cur.skipWorktreeSetup !== refMerged.skipWorktreeSetup) {
    lines.push(
      `Skip worktree setup: ${refMerged.skipWorktreeSetup} → ${cur.skipWorktreeSetup} (--skip-worktree-setup, Cursor only)`,
    );
  }

  return lines;
};
