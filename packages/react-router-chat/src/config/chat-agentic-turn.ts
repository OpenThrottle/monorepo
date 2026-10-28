/** How many times one logical turn auto-retries before surfacing manual Retry. */
export const MAX_AUTO_RETRIES = 1;

/**
 * Client stall watchdog window (ms): if a turn is pending but no chunk has
 * arrived for this long, assume the subscription died and recover. Set above the
 * server idle backstop (150s default) so the server's retryable terminal chunk
 * is preferred whenever it can still reach the client; the watchdog only covers
 * a silently-dead subscription.
 */
export const CLIENT_STALL_TIMEOUT_MS = 180_000;

/**
 * Mutation-in-flight watchdog window (ms): {@link CLIENT_STALL_TIMEOUT_MS} only
 * arms once a turn has a pending assistant id — i.e. after `startConversationStream`
 * returned and the stream began. The start mutation itself can stall (a slow or
 * wedged mutation, a dead network) BEFORE any assistant id or chunk exists, which
 * the chunk-based watchdog cannot see. This shorter timer covers exactly that gap
 * so a stalled mutation recovers instead of hanging the composer indefinitely.
 * Set well above a healthy mutation's round-trip (sub-second) and above the
 * server's cursor create-chat ceiling (30s) so a merely-slow mutation still
 * returns on its own before this fires.
 */
export const MUTATION_STALL_TIMEOUT_MS = 45_000;
