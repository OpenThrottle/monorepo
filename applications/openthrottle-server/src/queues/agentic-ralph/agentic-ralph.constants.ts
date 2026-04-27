/**
 * @description BullMQ **job name** for in-process Ralph via `createWorkflowRalphOrchestrator` on the
 * `plans` queue. Discriminated from spawn jobs by name and by `runKind` on the payload.
 */
export const RUN_PLAN_ORCHESTRATOR_JOB_NAME = 'Ralph Orchestrator';
