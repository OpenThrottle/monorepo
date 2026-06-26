import * as fs from 'node:fs/promises';
import { Logger } from '@nestjs/common';
import type { ProfileExecutionResult } from './profile-execution.types';

const DEFAULT_MAX_LINE_BYTES = 64 * 1024;
const LOG_CONTEXT = 'ProfileExecutionFileWriter';

/**
 * Minimum gap between emitted warnings, so a tight loop of failures can't flood
 * the logs. Failures inside the window are counted and summarized on the next log.
 */
const LOG_THROTTLE_MS = 5_000;

/**
 * Default sample rate: record every result. Callers on hot paths should lower this.
 */
const DEFAULT_SAMPLE_RATE = 1;

/**
 * Default buffering: flush immediately (one append per result) so behavior matches
 * the historical writer unless a caller opts into batching.
 */
const DEFAULT_MAX_BUFFERED_LINES = 1;
const DEFAULT_FLUSH_INTERVAL_MS = 0;

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

/**
 * Serializes a result to a single NDJSON line. JSON.stringify throws on circular
 * references, BigInt, and faulty toJSON implementations; rather than letting that
 * reject the write chain (silently dropping the record), emit a structured fallback
 * line so the failure is still recorded and diagnosable downstream.
 */
function serializeLine(
  result: ProfileExecutionResult,
  maxLineBytes: number,
): string {
  let line: string;

  try {
    line = JSON.stringify(result);
  } catch (cause) {
    return JSON.stringify({
      error: 'serialize_failed',
      label: result.label,
      reason: cause instanceof Error ? cause.message : String(cause),
    });
  }

  if (Buffer.byteLength(line, 'utf8') <= maxLineBytes) {
    return line;
  }

  return JSON.stringify({
    durationMs: result.durationMs,
    endTime: result.endTime,
    label: result.label,
    methodName: result.methodName,
    startTime: result.startTime,
    truncated: '[TRUNCATED:line-size]',
  });
}

function clampSampleRate(rate: number): number {
  if (Number.isNaN(rate) || rate <= 0) {
    return 0;
  }
  if (rate >= 1) {
    return 1;
  }
  return rate;
}

/**
 * @description Creates a reporter that appends each {@link ProfileExecutionResult} to a file (NDJSON).
 * Use with {@link setProfileExecutionReporter} so decorator and util output is written for AI consumption.
 * Writes are asynchronous and fire-and-forget from the reporter callback.
 *
 * To bound cost on hot paths, configure {@link ProfileExecutionFileWriterOptions.sampleRate}
 * (record a fraction of results), {@link ProfileExecutionFileWriterOptions.maxFileBytes}
 * (rotate instead of growing without bound), and/or
 * {@link ProfileExecutionFileWriterOptions.maxBufferedLines} +
 * {@link ProfileExecutionFileWriterOptions.flushIntervalMs} (batch appends).
 *
 * Inputs/output are only present when the producing decorator/util opted in to capture
 * (default OFF) and are redacted at the source. This writer additionally caps line size as
 * defense-in-depth. Inputs/output capture is for local/dev tuning only and must never be
 * enabled against PII-bearing resolvers in production.
 */
export function createProfileExecutionFileWriter(
  options: ProfileExecutionFileWriterOptions,
): ProfileExecutionFileWriter {
  const { maxFileBytes, outputPath } = options;
  const maxLineBytes = options.maxLineBytes ?? DEFAULT_MAX_LINE_BYTES;
  const sampleRate = clampSampleRate(options.sampleRate ?? DEFAULT_SAMPLE_RATE);
  const maxBufferedLines = Math.max(
    1,
    options.maxBufferedLines ?? DEFAULT_MAX_BUFFERED_LINES,
  );
  const flushIntervalMs = Math.max(
    0,
    options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS,
  );
  const logger = new Logger(LOG_CONTEXT);
  let writeChain: Promise<void> = Promise.resolve();

  // Approximate live size of outputPath. Seeded lazily on the first append from a
  // stat() so pre-existing files are accounted for, then maintained in-memory.
  let knownFileBytes: number | undefined;

  // Pending serialized lines awaiting flush (each already includes its trailing '\n').
  let buffer: string[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | undefined;

  // Rate-limit write-failure logging so a sustained failure (e.g. disk full,
  // permissions) can't flood the logs; suppressed failures are counted and
  // reported on the next emitted warning.
  let lastLoggedAt = 0;
  let suppressedSinceLastLog = 0;

  const logWriteFailure = (cause: unknown): void => {
    const now = Date.now();
    if (now - lastLoggedAt < LOG_THROTTLE_MS) {
      suppressedSinceLastLog += 1;
      return;
    }

    const reason = cause instanceof Error ? cause.message : String(cause);
    const suffix =
      suppressedSinceLastLog > 0
        ? ` (+${suppressedSinceLastLog} similar failures suppressed)`
        : '';
    logger.warn(
      `Failed to append profile execution result to ${outputPath}: ${reason}${suffix}`,
    );
    lastLoggedAt = now;
    suppressedSinceLastLog = 0;
  };

  // Rotate the current file out of the way so a fresh one is started. Best-effort:
  // a failed rename surfaces via the same throttled logger and we keep appending.
  const rotate = async (): Promise<void> => {
    await fs.rename(outputPath, `${outputPath}.1`);
    knownFileBytes = 0;
  };

  const append = async (payload: string): Promise<void> => {
    const payloadBytes = Buffer.byteLength(payload, 'utf8');

    if (maxFileBytes !== undefined) {
      if (knownFileBytes === undefined) {
        knownFileBytes = await fs
          .stat(outputPath)
          .then((stat) => stat.size)
          .catch(() => 0);
      }

      if (knownFileBytes > 0 && knownFileBytes + payloadBytes > maxFileBytes) {
        await rotate();
      }
    }

    await fs.appendFile(outputPath, payload, 'utf8');

    if (knownFileBytes !== undefined) {
      knownFileBytes += payloadBytes;
    }
  };

  const flush = (): void => {
    if (flushTimer !== undefined) {
      clearTimeout(flushTimer);
      flushTimer = undefined;
    }
    if (buffer.length === 0) {
      return;
    }

    const payload = buffer.join('');
    buffer = [];

    writeChain = writeChain
      .then(() => append(payload))
      .catch((cause: unknown) => {
        // Fire-and-forget from the reporter's perspective, but surface the
        // failure via the Nest logger instead of swallowing it silently.
        logWriteFailure(cause);
      });
    void writeChain;
  };

  const writer = (result: ProfileExecutionResult): void => {
    // Sample before any serialization so dropped results cost nothing on the hot path.
    if (sampleRate < 1 && Math.random() >= sampleRate) {
      return;
    }

    buffer.push(serializeLine(result, maxLineBytes) + '\n');

    if (buffer.length >= maxBufferedLines) {
      flush();
      return;
    }

    if (flushIntervalMs > 0 && flushTimer === undefined) {
      flushTimer = setTimeout(flush, flushIntervalMs);
      // Don't keep the event loop alive purely to flush profiling output.
      flushTimer.unref?.();
    }
  };

  const fileWriter: ProfileExecutionFileWriter = Object.assign(writer, {
    // Flush buffered lines, then await the (possibly chained) appends. flush() advances
    // writeChain, so awaiting the post-flush reference covers everything queued so far.
    drain: async (): Promise<void> => {
      flush();
      await writeChain;
    },
  });

  return fileWriter;
}
