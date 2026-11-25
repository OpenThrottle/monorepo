/**
 * @description Originating layer for a run-output chunk, used to make a single
 * mixed stdout/stderr stream attributable (finding #6). `plan-run` is the
 * plan-run orchestrator, `cursor-agent` is the agent dump it echoes, and `spawn`
 * is the process/package-manager wrapper that launches it.
 */
export const RUN_OUTPUT_SOURCE = {
  cursorAgent: 'cursor-agent',
  planRun: 'plan-run',
  spawn: 'spawn',
} as const;

export type RunOutputSourceKey = keyof typeof RUN_OUTPUT_SOURCE;
export type RunOutputSourceValue =
  (typeof RUN_OUTPUT_SOURCE)[RunOutputSourceKey];
