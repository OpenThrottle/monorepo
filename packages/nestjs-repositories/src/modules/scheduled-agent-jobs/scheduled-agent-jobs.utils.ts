/** Stable BullMQ scheduler id for a schedule row. */
export const schedulerKeyForJob = (jobId: string): string => {
  return `scheduled-job:${jobId}`;
};
