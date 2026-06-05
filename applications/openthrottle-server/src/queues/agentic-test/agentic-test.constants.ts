/** @description BullMQ queue name for the agentic smoke-test worker. */
export const AGENTIC_TEST_QUEUE_NAME = 'agentic-test';

/** @description Default BullMQ job name when enqueueing an agentic-test run. */
export const AGENTIC_TEST_JOB_NAME = 'agentic-test';

/** @description Number of timestamp echoes (one per second). */
export const AGENTIC_TEST_ECHO_COUNT = 30;

/** @description Delay between timestamp echoes. */
export const AGENTIC_TEST_ECHO_INTERVAL_MS = 1_000;

/**
 * @description Worker lock duration; must exceed total echo duration (~30s).
 */
export const AGENTIC_TEST_WORKER_LOCK_DURATION_MS = 60_000;
