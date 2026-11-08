import { PLAN_STATUS_VALUES, TASK_STATUS_VALUES } from './config.constants.ts';
import type { PlanStatus, TaskStatus } from './config.types.ts';

const TASK_STATUS_SET: ReadonlySet<string> = new Set(TASK_STATUS_VALUES);

const PLAN_STATUS_SET: ReadonlySet<string> = new Set(PLAN_STATUS_VALUES);

/**
 * @description Type guard: true when `value` is exactly a canonical plan status
 * label (case-sensitive; callers normalize casing first when needed).
 * @public
 */
export function isPlanStatus(value: string): value is PlanStatus {
  return PLAN_STATUS_SET.has(value);
}

/**
 * @description Type guard: true when `value` is a canonical task status label
 * (QUEUED and SCHEDULED are rejected — they are plans-only).
 * @public
 */
export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUS_SET.has(value);
}
