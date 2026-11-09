/**
 * @description Injection token for {@link LogJsonlSink} (append-only JSONL persistence).
 */
export const LOG_JSONL_SINK = Symbol('LOG_JSONL_SINK');

/**
 * @description Injection token for {@link LogStreamHub} (in-process fan-out for WebSockets).
 */
export const LOG_STREAM_HUB = Symbol('LOG_STREAM_HUB');
