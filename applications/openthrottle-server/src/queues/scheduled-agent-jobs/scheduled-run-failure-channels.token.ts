/**
 * @description Injection token for the registered {@link ScheduledRunFailureChannel} list. The
 * queue module provides an empty list; a channel module overrides it with its own channels.
 */
export const SCHEDULED_RUN_FAILURE_CHANNELS = 'SCHEDULED_RUN_FAILURE_CHANNELS';
