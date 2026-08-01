/**
 * @description BullMQ queue name that scheduled-agent-job runs execute on — the join key (with a
 * run's `bullmqJobId`) for `queueJobLogs`/`queueJobLogTail`. Mirrors the server constant
 * `SCHEDULED_AGENT_JOBS_QUEUE_NAME` (openthrottle-server is a separate app, not a client import), so
 * it is threaded through the run-detail loader rather than hardcoded in the component.
 */
export const SCHEDULED_AGENT_JOBS_QUEUE_NAME = 'Scheduled Agent Jobs';

/**
 * @description Map a scheduled-job run status to the BullMQ job-state vocabulary the log console
 * expects (`QUEUE_JOB_FINISHED_STATES` = completed|failed). Terminal run states read as finished so
 * the console stops expecting live output; queued/running stay active.
 */
export const RUN_STATUS_TO_JOB_STATE: Record<string, string> = {
  cancelled: 'failed',
  failed: 'failed',
  queued: 'waiting',
  running: 'active',
  succeeded: 'completed',
};

/**
 * @description Static copy/labels for the scheduled-job run-detail view. Kept out of the component
 * per the data/component split so wording changes never touch markup.
 */
export const RUN_DETAIL_COPY = {
  fields: {
    bullmqJobId: 'BullMQ job id',
    createdAt: 'Created',
    driver: 'Driver',
    duration: 'Duration',
    error: 'Error',
    exitCode: 'Exit code',
    finishedAt: 'Finished',
    model: 'Model',
    startedAt: 'Started',
    status: 'Status',
    trigger: 'Trigger',
  },
  heading: 'Run detail',
  logsHeading: 'Logs',
  logsPending: 'Logs available once the run is enqueued.',
  notEnqueued: 'Not enqueued yet',
} as const;
