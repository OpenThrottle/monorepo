import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';

export interface PlanRunWorkspacePreflightParams {
  readonly backend: WorkflowConfigRunner;
  /** Absolute path of the directory the agent will run in (the run's worktree). */
  readonly workingDirectory: string;
}
