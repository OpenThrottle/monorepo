/**
 * @description Shared types for the queues routing area. Hook-adjacent shapes
 * that used to be exported from `hooks/` files live here (hook-primitive-shape
 * H2).
 */

/** Live-stream lifecycle for the console indicator. */
export type QueueJobLogStreamStatus = 'ended' | 'error' | 'idle' | 'live';
