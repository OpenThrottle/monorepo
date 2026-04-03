import type { WorkflowError } from './workflow-error';

/**
 * @description Logical steps along the Ralph main() pipeline; used to tag discriminated results.
 */
export type WorkflowStepId =
  | 'bootstrap'
  | 'cortex.reachable'
  | 'target.resolve'
  | 'state.load'
  | 'prompt.build'
  | 'plan.guard'
  | 'plan.mark_in_progress'
  | 'task.mark_in_progress'
  | 'iteration.run'
  | 'tasks.apply_completions'
  | 'agent.parse_control';

type StepSuccess<
  TStep extends WorkflowStepId,
  TData extends Record<string, unknown> | undefined = undefined,
> = TData extends undefined
  ? { readonly step: TStep; readonly outcome: 'success' }
  : { readonly step: TStep; readonly outcome: 'success'; readonly data: TData };

type StepFailure<TStep extends WorkflowStepId> = {
  readonly step: TStep;
  readonly outcome: 'failure';
  readonly error: WorkflowError;
};

export type BootstrapStepResult =
  | StepSuccess<'bootstrap'>
  | StepFailure<'bootstrap'>;

export type CortexReachableStepResult =
  | StepSuccess<'cortex.reachable'>
  | StepFailure<'cortex.reachable'>;

export type TargetResolveStepResult =
  | StepSuccess<
      'target.resolve',
      {
        readonly effectivePlanId: string;
      }
    >
  | StepFailure<'target.resolve'>;

export type StateLoadStepResult =
  | StepSuccess<
      'state.load',
      {
        /** Opaque handles — implementations attach GraphQL result types later. */
        readonly planLoaded: true;
        readonly taskCount: number;
      }
    >
  | StepFailure<'state.load'>;

export type PromptBuildStepResult =
  | StepSuccess<
      'prompt.build',
      {
        readonly agentPrompt: string;
      }
    >
  | StepFailure<'prompt.build'>;

export type PlanGuardStepResult =
  | StepSuccess<
      'plan.guard',
      {
        readonly continue: boolean;
        readonly planStatus: string;
      }
    >
  | StepFailure<'plan.guard'>;

export type PlanMarkInProgressStepResult =
  | StepSuccess<'plan.mark_in_progress'>
  | StepFailure<'plan.mark_in_progress'>;

export type TaskMarkInProgressStepResult =
  | StepSuccess<'task.mark_in_progress'>
  | StepFailure<'task.mark_in_progress'>;

export type IterationRunStepResult =
  | StepSuccess<
      'iteration.run',
      {
        readonly iteration: number;
        readonly agentOutput: string;
      }
    >
  | StepFailure<'iteration.run'>;

export type TasksApplyCompletionsStepResult =
  | StepSuccess<
      'tasks.apply_completions',
      {
        readonly completedTaskIds: readonly string[];
      }
    >
  | StepFailure<'tasks.apply_completions'>;

/**
 * @description Outcome of interpreting `<promise>…</promise>` / terminal markers in agent output.
 */
export type AgentParseControlKind =
  | 'COMPLETE'
  | 'ERROR'
  | 'INPUT_REQUIRED'
  | 'NONE';

export type AgentParseControlStepResult =
  | StepSuccess<
      'agent.parse_control',
      {
        readonly control: AgentParseControlKind;
      }
    >
  | StepFailure<'agent.parse_control'>;

/**
 * @description Union of all step results for exhaustive handling in orchestrators.
 */
export type WorkflowStepResult =
  | AgentParseControlStepResult
  | BootstrapStepResult
  | CortexReachableStepResult
  | IterationRunStepResult
  | PlanGuardStepResult
  | PlanMarkInProgressStepResult
  | PromptBuildStepResult
  | StateLoadStepResult
  | TargetResolveStepResult
  | TaskMarkInProgressStepResult
  | TasksApplyCompletionsStepResult;
