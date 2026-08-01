import type { WorkflowRalphExecutionBackendUi } from '~/routing/plans/utils/build-workflow-ralph-argv';

/** Runner backends offered in the execution selector, in display order. */
export const EXECUTION_BACKENDS = [
  'cursor',
  'claude',
] as const satisfies readonly WorkflowRalphExecutionBackendUi[];

export const isExecutionBackend = (
  value: string,
): value is WorkflowRalphExecutionBackendUi =>
  EXECUTION_BACKENDS.some((backend) => backend === value);
