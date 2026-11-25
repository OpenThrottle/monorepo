/** @public */
export const LOOP_TASK_STATUS = {
  BLOCKED: 'BLOCKED',
  COMPLETED: 'COMPLETED',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  SKIPPED: 'SKIPPED',
} as const;

export type LoopTaskStatusKey = keyof typeof LOOP_TASK_STATUS;
/** @public */
export type LoopTaskStatusValue = (typeof LOOP_TASK_STATUS)[LoopTaskStatusKey];

/** @public */
export const LOOP_PLAN_STATUS = {
  BLOCKED: 'BLOCKED',
  COMPLETED: 'COMPLETED',
  IN_PROGRESS: 'IN_PROGRESS',
} as const;

export type LoopPlanStatusKey = keyof typeof LOOP_PLAN_STATUS;
/** @public */
export type LoopPlanStatusValue = (typeof LOOP_PLAN_STATUS)[LoopPlanStatusKey];

/**
 * @description What a plan-output chunk is. The values mirror the `plan_output_stream.kind` CHECK
 * (docs/workflows/ot-loop-job.md § 10.1); the package keeps its own copy so it needs no server dependency.
 * @public
 */
export const LOOP_OUTPUT_KIND = {
  LOOP: 'loop',
  TOOL: 'tool',
  VALIDATION: 'validation',
  WORKER: 'worker',
} as const;

export type LoopOutputKindKey = keyof typeof LOOP_OUTPUT_KIND;
/** @public */
export type LoopOutputKindValue = (typeof LOOP_OUTPUT_KIND)[LoopOutputKindKey];
