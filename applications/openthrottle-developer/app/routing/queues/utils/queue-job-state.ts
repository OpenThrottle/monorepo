import type { BadgeProps } from '@openthrottle/react-router-shadcn';

/**
 * The eight canonical BullMQ job states (mirrors the server's `VALID_JOB_STATES`).
 * This is the single source of truth the Queues UI keys colors and labels off of.
 */
export const QUEUE_JOB_STATES = [
  'active',
  'completed',
  'delayed',
  'failed',
  'paused',
  'prioritized',
  'waiting',
  'waiting-children',
] as const;

type QueueJobState = (typeof QUEUE_JOB_STATES)[number];

interface QueueJobStateMeta {
  readonly color: NonNullable<BadgeProps['color']>;
  readonly label: string;
}

const QUEUE_JOB_STATE_META: Record<QueueJobState, QueueJobStateMeta> = {
  active: { color: 'yellow', label: 'Active' },
  completed: { color: 'green', label: 'Completed' },
  delayed: { color: 'amber', label: 'Delayed' },
  failed: { color: 'red', label: 'Failed' },
  paused: { color: 'slate', label: 'Paused' },
  prioritized: { color: 'sky', label: 'Prioritized' },
  waiting: { color: 'blue', label: 'Waiting' },
  'waiting-children': { color: 'violet', label: 'Waiting on children' },
};

const isQueueJobState = (state: string): state is QueueJobState =>
  Object.prototype.hasOwnProperty.call(QUEUE_JOB_STATE_META, state);

/**
 * @description Badge color for a job state; falls back to the neutral default for unknown states.
 */
export const queueJobStateColor = (state: string): BadgeProps['color'] =>
  isQueueJobState(state) ? QUEUE_JOB_STATE_META[state].color : 'default';

/**
 * @description Human-readable label for a job state; unknown states render verbatim.
 */
export const queueJobStateLabel = (state: string): string =>
  isQueueJobState(state) ? QUEUE_JOB_STATE_META[state].label : state;
