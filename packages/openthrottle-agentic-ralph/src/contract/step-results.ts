import type {
  WorkflowStepFailure,
  WorkflowStepSuccess,
} from '@openthrottle/openthrottle-agentic-workflow';

/**
 * @description Logical steps along the Ralph main() pipeline; used to tag
 * discriminated results.
 */
export type WorkflowStepId =
  | 'bootstrap'
  | 'healthcheck'
  | 'target.resolve'
  | 'state.load'
  | 'prompt.build'
  | 'plan.guard'
  | 'plan.mark_in_progress'
  | 'task.mark_in_progress'
  | 'iteration.run'
  | 'tasks.apply_completions'
  | 'agent.parse_control';

type StepFailure<TStep extends WorkflowStepId> = WorkflowStepFailure<TStep>;

type StepSuccess<
  TStep extends WorkflowStepId,
  TData extends Record<string, unknown> | undefined = undefined,
> = WorkflowStepSuccess<TStep, TData>;

export type StepBootstrapResult =
  | StepSuccess<'bootstrap'>
  | StepFailure<'bootstrap'>;

export type StepHealthcheckResult =
  | StepSuccess<'healthcheck'>
  | StepFailure<'healthcheck'>;

export type StepTargetResolveResult =
  | StepSuccess<'target.resolve', { readonly effectivePlanId: string }>
  | StepFailure<'target.resolve'>;

export type StepStateLoadResult =
  | StepSuccess<'state.load', { readonly planLoaded: true; readonly taskCount: number }> // prettier-ignore
  | StepFailure<'state.load'>;

export type StepPromptBuildResult =
  | StepSuccess<'prompt.build', { readonly agentPrompt: string }>
  | StepFailure<'prompt.build'>;

export type StepPlanGuardResult =
  | StepSuccess<'plan.guard', { readonly continue: boolean; readonly planStatus: string }> // prettier-ignore
  | StepFailure<'plan.guard'>;

export type StepPlanMarkInProgressResult =
  | StepSuccess<'plan.mark_in_progress'>
  | StepFailure<'plan.mark_in_progress'>;

export type StepTaskMarkInProgressResult =
  | StepSuccess<'task.mark_in_progress'>
  | StepFailure<'task.mark_in_progress'>;

export type StepIterationRunResult =
  | StepSuccess<'iteration.run', { readonly iteration: number; readonly agentOutput: string }> // prettier-ignore
  | StepFailure<'iteration.run'>;

export type StepTasksApplyCompletionsResult =
  | StepSuccess<'tasks.apply_completions', { readonly completedTaskIds: readonly string[] }> // prettier-ignore
  | StepFailure<'tasks.apply_completions'>;

/**
 * @description Outcome of interpreting `<promise>…</promise>` / terminal markers in agent output.
 */
export type AgentParseControlKind =
  | 'COMPLETE'
  | 'ERROR'
  | 'INPUT_REQUIRED'
  | 'NONE';

export type StepAgentParseControlResult =
  | StepSuccess<'agent.parse_control', { readonly control: AgentParseControlKind }> // prettier-ignore
  | StepFailure<'agent.parse_control'>;

/**
 * @description Union of all step results for exhaustive handling in orchestrators.
 */
export type WorkflowStepResult =
  | StepAgentParseControlResult
  | StepBootstrapResult
  | StepHealthcheckResult
  | StepIterationRunResult
  | StepPlanGuardResult
  | StepPlanMarkInProgressResult
  | StepPromptBuildResult
  | StepStateLoadResult
  | StepTargetResolveResult
  | StepTaskMarkInProgressResult
  | StepTasksApplyCompletionsResult;
