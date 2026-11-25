import type { QUEUE_JOB_STATES } from '~/routing/queues/utils/queue-job-state';

/**
 * @description Tailwind dot colour per job state, matching the hue of
 * `QueueStateBadge` so the state filter reads like the table it filters.
 */
export const QUEUE_JOB_STATE_DOT_COLOR: Record<
  (typeof QUEUE_JOB_STATES)[number],
  string
> = {
  active: 'bg-yellow-500',
  completed: 'bg-green-500',
  delayed: 'bg-amber-500',
  failed: 'bg-red-500',
  paused: 'bg-slate-500',
  prioritized: 'bg-sky-500',
  waiting: 'bg-blue-500',
  'waiting-children': 'bg-violet-500',
};

/** Neutral dot for a state the UI does not know. */
export const QUEUE_JOB_STATE_DOT_FALLBACK = 'bg-muted-foreground';
