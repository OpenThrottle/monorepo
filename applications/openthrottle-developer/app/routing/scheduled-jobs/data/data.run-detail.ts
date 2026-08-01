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
  notEnqueued: 'Not enqueued yet',
} as const;
