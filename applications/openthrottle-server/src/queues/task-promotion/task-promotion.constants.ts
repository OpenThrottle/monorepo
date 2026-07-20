/** Queue name for task→plan promotion jobs. */
export const TASK_PROMOTION_QUEUE_NAME = 'task-promotion';

/** Job name: promote one task into a new plan. */
export const TASK_PROMOTION_PROMOTE_JOB_NAME = 'promote';

/** Worker concurrency: promotions are rare, multi-step DB transactions. */
export const TASK_PROMOTION_WORKER_CONCURRENCY = 1;

/** Status the source task is moved to once promoted (terminal). */
export const PROMOTED_TASK_STATUS = 'SKIPPED';

/** Tag stamped on a source task after it is promoted (also the no-op guard). */
export const PROMOTED_TAG = 'promoted';

/** Title of the single runnable task seeded on a freshly promoted plan. */
export const SEED_TASK_TITLE = 'Break down and scope this plan';

/** tool_name recorded on the work session that captures a promotion. */
export const PROMOTION_SESSION_TOOL_NAME = 'task-promotion';
