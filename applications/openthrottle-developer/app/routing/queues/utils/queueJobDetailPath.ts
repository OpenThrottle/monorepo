/**
 * @description Builds the developer-portal path to a queue job detail page (encoded segments).
 */
export const queueJobDetailPath = (
  queueName: string,
  jobId: string,
): string => {
  const q = encodeURIComponent(queueName);
  const j = encodeURIComponent(jobId);
  return `/queues/${q}/${j}`;
};
