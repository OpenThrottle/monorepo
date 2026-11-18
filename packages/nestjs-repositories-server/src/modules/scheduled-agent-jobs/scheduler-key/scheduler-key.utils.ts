/**
 * @description Stable BullMQ scheduler id for a schedule row.
 * @public
 */
export const schedulerKeyForJob = (jobId: string): string => {
  return `scheduled-job:${jobId}`;
};
