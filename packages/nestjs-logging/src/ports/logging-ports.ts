import type { NestjsLoggingLevel } from '../config/nestjs-logging-levels';

/**
 * @description JSON primitives allowed inside {@link JsonValue}.
 */
export type JsonPrimitive = boolean | null | number | string;

/**
 * @description JSON-serializable value (for {@link StructuredLogRecord.extra} and similar).
 */
export type JsonValue =
  | JsonPrimitive
  | readonly JsonPrimitive[]
  | Readonly<Record<string, JsonPrimitive>>;

/**
 * @description Single structured line persisted as JSON and broadcast on the hub.
 */
export interface StructuredLogRecord {
  readonly context: string;
  readonly correlationId: string | undefined;
  readonly extra?: Readonly<Record<string, JsonValue>>;
  readonly hostname?: string;
  readonly level: NestjsLoggingLevel;
  readonly message: string;
  readonly pid?: number;
  readonly spanId?: string;
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
 * @description Chunk of parsed JSONL records and the next byte offset for incremental replay.
 */
export interface LogReplayChunk {
  readonly nextByteOffset: number;
  readonly records: ReadonlyArray<StructuredLogRecord>;
}

/**
 * @description In-process fan-out for WebSocket tail/subscribe and replay helpers.
 */
export interface LogStreamHub {
  /**
   * @description Fan-out one record to subscribers (after persistence); respects configured levels.
   */
  publish(record: StructuredLogRecord): void;

  /**
   * @description Read complete JSONL lines starting at {@link byteOffset} (skip a leading partial line when offset is mid-line); caps read size for backpressure.
   */
  readReplayFromByteOffset(byteOffset: number): Promise<LogReplayChunk>;

  /**
   * @description Read up to {@link lineCount} complete records from the tail of the active JSONL file (bounded by module replay limits).
   */
  readReplayTailLines(
    lineCount?: number,
  ): Promise<ReadonlyArray<StructuredLogRecord>>;

  /**
   * @description Register a listener; returned function unsubscribes.
   */
  subscribe(listener: (record: StructuredLogRecord) => void): () => void;
}
