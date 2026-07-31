import type { BadgeProps } from '@openthrottle/react-router-shadcn';

/**
 * Queue health rolls the raw BullMQ counts up into one green/amber/red signal
 * an operator can scan. Failures are the strongest signal; a large backlog
 * (waiting + delayed) is the secondary one. Thresholds are deliberate,
 * named constants so the meaning of each band is explicit and testable.
 */
export type QueueHealthLevel = 'critical' | 'degraded' | 'healthy';

/** A single failed job is enough to leave the healthy band. */
const FAILED_DEGRADED_THRESHOLD = 1;
/** Sustained failures escalate to critical. */
const FAILED_CRITICAL_THRESHOLD = 25;
/** Backlog (waiting + delayed) that warrants attention. */
const BACKLOG_DEGRADED_THRESHOLD = 100;
/** Backlog that indicates workers are not keeping up. */
const BACKLOG_CRITICAL_THRESHOLD = 500;

export interface QueueHealthCounts {
  readonly activeCount?: number;
  readonly delayedCount?: number;
  readonly failedCount?: number;
  readonly waitingCount?: number;
}

export interface QueueHealthResult {
  readonly backlog: number;
  readonly color: NonNullable<BadgeProps['color']>;
  readonly label: string;
  readonly level: QueueHealthLevel;
}

const HEALTH_META: Record<
  QueueHealthLevel,
  { color: NonNullable<BadgeProps['color']>; label: string }
> = {
  critical: { color: 'red', label: 'Critical' },
  degraded: { color: 'amber', label: 'Degraded' },
  healthy: { color: 'green', label: 'Healthy' },
};

const safeCount = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;

/**
 * @description Rolls raw queue counts into a green/amber/red health signal with backlog (waiting + delayed).
 */
export const computeQueueHealth = (
  counts: QueueHealthCounts,
): QueueHealthResult => {
  const failed = safeCount(counts.failedCount);
  const backlog =
    safeCount(counts.waitingCount) + safeCount(counts.delayedCount);

  let level: QueueHealthLevel = 'healthy';
  if (
    failed >= FAILED_CRITICAL_THRESHOLD ||
    backlog >= BACKLOG_CRITICAL_THRESHOLD
  ) {
    level = 'critical';
  } else if (
    failed >= FAILED_DEGRADED_THRESHOLD ||
    backlog >= BACKLOG_DEGRADED_THRESHOLD
  ) {
    level = 'degraded';
  }

  return {
    backlog,
    color: HEALTH_META[level].color,
    label: HEALTH_META[level].label,
    level,
  };
};
