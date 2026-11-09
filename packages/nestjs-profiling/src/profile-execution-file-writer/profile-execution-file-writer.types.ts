import type { ProfileExecutionResult } from '../decorators/decorators.types.ts';

/**
 * @description Options for writing profile execution results to a file (e.g. for AI tuning and debugging).
 */
export interface ProfileExecutionFileWriterOptions {
  /**
   * Flush the buffer at least this often (ms), even if {@link maxBufferedLines}
   * has not been reached. `0` disables time-based flushing (lines flush only when
   * the buffer fills). Ignored when buffering is effectively off (maxBufferedLines <= 1).
   * @default 0
   */
  readonly flushIntervalMs?: number;

  /**
   * Format: 'ndjson' (one JSON object per line, append-friendly).
   * @default 'ndjson'
   */
  readonly format?: 'ndjson';

  /**
   * Buffer up to this many serialized lines before flushing them to disk in a single
   * append, amortizing `fs.appendFile` overhead on hot paths. `1` (default) flushes
   * every result immediately. Combine with {@link flushIntervalMs} to bound latency.
   * @default 1
   */
  readonly maxBufferedLines?: number;

  /**
   * Soft cap on the output file size in bytes. When an append would push the file past
   * this size, the current file is rotated to `<outputPath>.1` (replacing any prior
   * rotation) and a fresh file is started, bounding total disk use to ~2x this value.
   * `undefined` disables rotation (unbounded growth — local/dev only).
   * @default undefined
   */
  readonly maxFileBytes?: number;

  /**
   * Hard cap on the byte length of a single serialized NDJSON line. Lines exceeding this
   * are replaced with a truncated marker rather than written verbatim, as defense-in-depth
   * against oversized (and potentially sensitive) payloads reaching disk.
   * @default 65536
   */
  readonly maxLineBytes?: number;

  /**
   * Output file path. Directory must exist; file is created if missing and appended to.
   */
  readonly outputPath: string;

  /**
   * Fraction of results to record, in `[0, 1]`. `1` records every result; `0` records
   * none; `0.1` records ~10%. Sampling is decided per result before serialization, so
   * dropped results incur no `JSON.stringify`/`appendFile` cost. Values outside `[0, 1]`
   * are clamped.
   * @default 1
   */
  readonly sampleRate?: number;
}

/**
 * @description A profile-execution reporter that appends results to a file. Callable as a
 * reporter (`(result) => void`) and additionally exposes {@link drain} so callers — chiefly
 * tests — can deterministically await the otherwise fire-and-forget writes instead of racing
 * an arbitrary `setTimeout`.
 */
export interface ProfileExecutionFileWriter {
  (result: ProfileExecutionResult): void;

  /**
   * Flush any buffered lines and resolve once all in-flight appends settle. The returned
   * promise never rejects: write failures are surfaced via the Nest logger, not propagated.
   */
  drain(): Promise<void>;
}
