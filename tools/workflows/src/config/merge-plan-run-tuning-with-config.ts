/**
 * @description Merges enqueue / GraphQL {@link PlanRunTuningMergeInput} over file + env defaults
 * from {@link loadWorkflowRalphConfig}. Precedence: **enqueue tuning > env > file > built-ins**.
 */

import type { WorkflowRalphResolvedDefaults } from './workflow-ralph-defaults.types.ts';
import type { WorkflowConfigDebug } from '@openthrottle/openthrottle-agentic-workflow';

/** @description Subset of GraphQL `RalphPlanRunTuningInput` / nested job tuning fields. */
export interface PlanRunTuningMergeInput {
  readonly backend?: string | null;
  readonly iterationTimeoutSeconds?: number | null;
  readonly iterations?: number | null;
  readonly model?: string | null;
  readonly project?: string | null;
  readonly prompt?: string | null;
  readonly ralphDebugCli?: WorkflowConfigDebug | null;
  readonly skipWorktreeSetup?: boolean | null;
  readonly worktree?: string | null;
  readonly worktreeBase?: string | null;
}

const mapDefaultsDebugToNestedCli = (
  debug: WorkflowRalphResolvedDefaults['debug'],
): WorkflowConfigDebug => {
  switch (debug) {
    case 'debug':
      return 'debug';
    case 'verbose':
      return 'verbose';
    case 'omit':
      return 'omit';
    default: {
      const _exhaustive: never = debug;
      return _exhaustive;
    }
  }
};

const hasString = (value: string | null | undefined): value is string =>
  value != null && value.trim() !== '';

/**
 * @description Applies enqueue / job tuning over merged file + env defaults. Omitted tuning
 * fields fall through to {@link config}; explicit null/undefined on tuning means “use lower layers”.
 */
export const mergePlanRunTuningWithWorkflowRalphConfig = (
  ralph: PlanRunTuningMergeInput | null | undefined,
  config: WorkflowRalphResolvedDefaults,
): PlanRunTuningMergeInput => {
  const r = ralph ?? {};

  return {
    backend: r.backend ?? config.backend,
    iterationTimeoutSeconds:
      r.iterationTimeoutSeconds ?? config.iterationTimeout ?? undefined,
    iterations: r.iterations ?? config.iterations,
    model: hasString(r.model) ? r.model.trim() : config.model,
    project: hasString(r.project) ? r.project.trim() : config.project,
    prompt: hasString(r.prompt) ? r.prompt.trim() : config.prompt,
    ralphDebugCli: r.ralphDebugCli ?? mapDefaultsDebugToNestedCli(config.debug),
    skipWorktreeSetup: r.skipWorktreeSetup ?? config.skipWorktreeSetup,
    worktree: hasString(r.worktree) ? r.worktree.trim() : config.worktree,
    worktreeBase: hasString(r.worktreeBase)
      ? r.worktreeBase.trim()
      : config.worktreeBase,
  };
};
