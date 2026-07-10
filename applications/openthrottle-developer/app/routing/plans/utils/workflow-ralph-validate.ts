/**
 * @description Validates the `workflow-ralph` run-options UI state the same way
 * the plan route + CLI preview do: targets (`--plan` / `--task` UUIDs),
 * `--iterations`, optional `--iteration-timeout` text, backend id, prompt
 * mutual-exclusion, worktree rules, and the optional enqueue tuning shape
 * (`RalphPlanRunTuningInputSchema` + CLI-aligned refinements). Messages mirror
 * `tools/workflows/src/utils/parsers.ts` where applicable.
 */

import { RalphPlanRunTuningInputSchema } from '~/__generated__/schemas';
import {
  DEFAULT_RALPH_PROMPT,
  WORKFLOW_RALPH_KNOWN_BACKENDS,
  isUuid,
  parseWorkflowRunIterationTimeoutSeconds,
  type WorkflowRalphRunOptionsInput,
} from './workflow-ralph-config';
import { buildRalphPlanRunTuningInputFromWorkflowRunOptions } from './workflow-ralph-tuning';

/**
 * @description One validation issue; messages mirror `tools/workflows/src/utils/parsers.ts` where applicable.
 */
interface WorkflowRalphValidationIssue {
  readonly code: string;
  readonly message: string;
}

/**
 * @description Options for {@link validateWorkflowRalphRunOptionsState}. When `requireCliTargetIds` is
 * false, `--plan` / `--task` id rules are skipped (e.g. Configuration panel without a route-seeded id).
 */
interface ValidateWorkflowRalphRunOptionsStateOptions {
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
      readonly issues: readonly WorkflowRalphValidationIssue[];
      readonly ok: false;
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
  if (!WORKFLOW_RALPH_KNOWN_BACKENDS.some((known) => known === backend)) {
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
    if (input.promptFile.trim() === '') {
      issues.push({
        code: 'prompt_file_empty',
        message: '--prompt-file requires a non-empty path',
      });
    }
  }

  if (input.worktreeCli === 'named' && input.worktreeName.trim() === '') {
    issues.push({
      code: 'worktree_name_empty',
      message:
        'Agent CLI worktree name is required when using named --worktree',
    });
  }

  if (input.executionBackend !== 'cursor') {
    if (input.worktreeBase.trim() !== '') {
      issues.push({
        code: 'worktree_base_claude',
        message: '--worktree-base is only supported when backend is cursor',
      });
    }

    if (input.skipWorktreeSetup) {
      issues.push({
        code: 'skip_worktree_setup_claude',
        message:
          '--skip-worktree-setup is only supported when backend is cursor',
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
