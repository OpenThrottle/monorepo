/** @description BullMQ queue for Jest-style plan/task lifecycle hook child jobs. */
export const PLAN_LIFECYCLE_HOOKS_QUEUE_NAME = 'plan-lifecycle-hooks';

/** @description BullMQ job name for one hook invocation. */
export const PLAN_LIFECYCLE_HOOK_JOB_NAME = 'lifecycle-hook';

/** @description Worker concurrency for lifecycle hook children (independent of plans limiter). */
export const PLAN_LIFECYCLE_HOOKS_WORKER_CONCURRENCY = 2;
