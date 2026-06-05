/**
 * Structured log event names for agentic workflow lifecycle lines (start/end).
 * Application code should emit JSON payloads that include correlation fields from
 * {@link WorkflowCorrelation} plus workflow-specific attributes at the app layer.
 */
export const WORKFLOW_EVENT = {
  JOB_RUN: 'job_run',
  METRIC: 'metric',
} as const;
