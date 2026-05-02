import type { NestjsLoggingLevel } from '../config/nestjs-logging-levels';

/**
 * @description Single structured line persisted as JSON and broadcast on the hub.
 */
export interface StructuredLogRecord {
  readonly context: string;
  readonly correlationId: string | undefined;
  readonly level: NestjsLoggingLevel;
  readonly message: string;
  readonly timestampIso: string;
  readonly traceId: string | undefined;
}

/**
 * @description Append-only JSONL file sink (durable persistence).
 */
export interface LogJsonlSink {
  /**
   * @description Append one record; implementations may buffer until {@link LogJsonlSink.flush}.
   */
  append(record: StructuredLogRecord): Promise<void> | void;

  /**
   * @description Force any buffered bytes to disk.
   */
  flush(): Promise<void> | void;
}

/**
 * @description In-process fan-out for WebSocket tail/subscribe and replay helpers.
 */
export interface LogStreamHub {
  /**
   * @description Register a listener; returned function unsubscribes.
   */
  subscribe(listener: (record: StructuredLogRecord) => void): () => void;
}
