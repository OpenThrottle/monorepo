/**
 * @description Reads the queued job id out of a `promoteTask` action result,
 * which is untyped at this boundary. Null when the shape is not an object with a
 * string `jobId`.
 */
export const readPromoteTaskJobId = (promoteTask: unknown): string | null => {
  if (typeof promoteTask !== 'object' || promoteTask === null) {
    return null;
  }

  if ('jobId' in promoteTask && typeof promoteTask.jobId === 'string') {
    return promoteTask.jobId;
  }

  return null;
};

/**
 * @description Description for the "Promotion queued" toast: names the job when
 * its id is known.
 */
export const getPromotionQueuedDescription = (jobId: string | null): string => {
  const surfacesLater = `The new plan appears on the plans list once the job completes.`;

  if (jobId != null && jobId !== '') {
    return `Job ${jobId}. ${surfacesLater}`;
  }

  return surfacesLater;
};
