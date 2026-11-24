import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-utils';

export interface PlanRunWorkspacePreflightParams {
  readonly driver: WorkflowConfigRunner;
  /** Absolute path of the directory the agent will run in (the run's worktree). */
  readonly workingDirectory: string;
}
