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
 *
 * `no_op` maps to `completed`, not `failed`: the process finished cleanly, so the console should stop
 * tailing rather than present the run as an error. Whether work actually happened is conveyed by the
 * status badge (see `RUN_STATUS_COLOR`), not by the log-console state.
 */
export const RUN_STATUS_TO_JOB_STATE: Record<string, string> = {
  cancelled: 'failed',
  failed: 'failed',
  no_op: 'completed',
  queued: 'waiting',
  running: 'active',
  succeeded: 'completed',
};

/**
 * @description Run statuses that can still be cancelled (a cancel marker is only meaningful before a
 * run reaches a terminal state). Drives whether the run-detail view offers the Cancel action.
 */
export const CANCELABLE_RUN_STATUSES = new Set(['queued', 'running']);

/**
 * @description Static copy/labels for the scheduled-job run-detail view. Kept out of the component
 * per the data/component split so wording changes never touch markup.
 */
export const RUN_DETAIL_COPY = {
  cancel: 'Cancel run',
  cancelRequested: 'Cancel requested…',
  fields: {
    bullmqJobId: 'BullMQ job id',
    createdAt: 'Created',
    driver: 'Driver',
    duration: 'Duration',
    error: 'Error',
    exitCode: 'Exit code',
    finishedAt: 'Finished',
    model: 'Model',
    repository: 'Repository',
    startedAt: 'Started',
    status: 'Status',
    trigger: 'Trigger',
  },
  heading: 'Run detail',
  logsHeading: 'Logs',
  logsPending: 'Logs available once the run is enqueued.',
  notEnqueued: 'Not enqueued yet',
  /** Shown under the repository row: these columns are a fire-time snapshot, not a live join. */
  repositoryNote:
    'Where this run executed, captured when it fired — the schedule may target somewhere else now.',
  repositoryWorkspaceRoot: 'Workspace root (default)',
  settings: {
    empty: 'No settings snapshot was captured for this run.',
    heading: 'Settings snapshot',
  },
  usage: {
    cost: 'Cost',
    empty: 'No token usage was reported for this run.',
    heading: 'Token usage',
  },
} as const;
