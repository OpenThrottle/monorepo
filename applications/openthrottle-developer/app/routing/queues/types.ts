/**
 * @description Shared types for the queues routing area. Hook-adjacent shapes
 * that used to be exported from `hooks/` files live here (hook-primitive-shape
 * H2).
 */

import type { QueueJobLogEventFragment } from '~/__generated__/graphql';

/** One job-log event as the history loader and the live tail return it. */
export type QueueJobLogEvent = QueueJobLogEventFragment;

/** Live-stream lifecycle for the console indicator. */
export type QueueJobLogStreamStatus = 'ended' | 'error' | 'idle' | 'live';
