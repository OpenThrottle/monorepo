interface MemorySnapshot {
  readonly heapUsedMb: number;
  readonly rssMb: number;
}

interface QueueJobTaskRunMetrics {
  readonly atEnd: MemorySnapshot;
  readonly atStart: MemorySnapshot;
}

const formatMemoryLine = (label: string, snapshot: MemorySnapshot): string => {
  const rss = snapshot.rssMb.toFixed(1);
  const heap = snapshot.heapUsedMb.toFixed(1);

  return `${label} RSS: ${rss} MB / heap ${heap} MB`;
};

/**
 * @description Start and end memory lines for a job's task-run metrics; empty
 * when the worker recorded none.
 */
export const buildQueueJobMetricLines = (
  metrics: QueueJobTaskRunMetrics | null | undefined,
): string[] => {
  if (metrics == null) {
    return [];
  }

  return [
    formatMemoryLine('Start', metrics.atStart),
    formatMemoryLine('End', metrics.atEnd),
  ];
};
