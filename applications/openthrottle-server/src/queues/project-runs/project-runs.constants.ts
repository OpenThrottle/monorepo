/** BullMQ queue that advances project runs. Never rename: the name is a Redis key. */
export const PROJECT_RUNS_QUEUE_NAME = 'Project Runs';

/** Job that advances one project run, enqueued whenever one of its plan runs settles. */
export const PROJECT_RUN_ADVANCE_JOB_NAME = 'Advance Project Run';

/** Repeatable backstop that advances every active project run (missed hooks, a restart). */
export const PROJECT_RUNS_RECONCILE_JOB_NAME = 'Reconcile Project Runs';

/** Job-id prefix of an advance job: `<prefix><projectRunId>-<trigger>`, so a redelivered trigger dedupes. */
export const PROJECT_RUN_ADVANCE_JOB_ID_PREFIX = 'project-run-advance-';
