/**
 * @description Originating layer for a run-output chunk, used to make a single
 * mixed stdout/stderr stream attributable (finding #6). `workflow-ralph` is the
 * nested CLI orchestrator, `cursor-agent` is the agent dump it echoes, and `spawn`
 * is the process/package-manager wrapper that launches it.
 */
export const RUN_OUTPUT_SOURCE = {
  cursorAgent: 'cursor-agent',
  spawn: 'spawn',
  workflowRalph: 'workflow-ralph',
} as const;
