/**
 * Bounded, fail-open stats over the four JSONL buffers: how many lines are
 * waiting, how old the oldest record is, and how many were dead-lettered.
 */
import fs from 'node:fs';

import {
  deadLetterPathFor,
  defaultJsonlPath,
  defaultOutcomesJsonlPath,
  defaultTokenUsageJsonlPath,
  defaultTrajectoriesJsonlPath,
} from './jsonl.ts';

/** Read size for line counting; a file is never held in memory whole. */
const COUNT_CHUNK_BYTES = 64 * 1024;

/** Most of a file's head read to find its first line. */
const HEAD_CAP_BYTES = 64 * 1024;

/** Record fields that carry a timestamp, in priority order. */
const TIMESTAMP_FIELDS = [
  'occurred_at',
  'started_at',
  'received_at',
  'created_at',
  'timestamp',
] as const;

/**
 * Stats for one buffer file and its dead-letter sibling.
 *
 * @public
 */
export interface BufferFileStats {
  readonly deadLetterLines: number;
  readonly label: BufferLabel;
  readonly lines: number;
  readonly oldestAt: string | null;
}

/**
 * The four buffered streams.
 *
 * @public
 */
export type BufferLabel =
  'events' | 'outcomes' | 'token-usage' | 'trajectories';

/**
 * Stats across every buffer.
 *
 * @public
 */
export interface BufferStats {
  readonly files: readonly BufferFileStats[];
  readonly oldestAt: string | null;
  readonly totalDeadLetterLines: number;
  readonly totalLines: number;
}

const readFileHead = (fd: number): string => {
  const buf = Buffer.alloc(HEAD_CAP_BYTES);
  const read = fs.readSync(fd, buf, 0, HEAD_CAP_BYTES, 0);
  return buf.toString('utf8', 0, read);
};

/** Non-empty line count plus the first non-empty line, read in chunks. */
const scanFile = (
  filePath: string,
): { firstLine: string | null; lines: number } => {
  try {
    const fd = fs.openSync(filePath, 'r');
    try {
      const buf = Buffer.alloc(COUNT_CHUNK_BYTES);
      let lines = 0;
      let lineHasContent = false;
      let position = 0;
      for (;;) {
        const read = fs.readSync(fd, buf, 0, COUNT_CHUNK_BYTES, position);
        if (read === 0) {
          break;
        }
        position += read;
        for (let i = 0; i < read; i += 1) {
          const byte = buf[i];
          if (byte === 0x0a) {
            if (lineHasContent) {
              lines += 1;
            }
            lineHasContent = false;
          } else if (byte !== 0x0d && byte !== 0x20 && byte !== 0x09) {
            lineHasContent = true;
          }
        }
      }
      if (lineHasContent) {
        lines += 1;
      }
      if (lines === 0) {
        return { firstLine: null, lines: 0 };
      }
      const firstLine =
        readFileHead(fd)
          .split('\n')
          .find((line) => line.trim() !== '') ?? null;
      return { firstLine, lines };
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return { firstLine: null, lines: 0 };
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/** First present timestamp field of a JSON line, normalized to ISO; else null. */
const timestampOfLine = (line: string | null): string | null => {
  if (line === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(line);
    if (!isRecord(parsed)) {
      return null;
    }
    for (const field of TIMESTAMP_FIELDS) {
      const value = parsed[field];
      if (typeof value === 'string' || typeof value === 'number') {
        const ms = new Date(value).getTime();
        return Number.isNaN(ms) ? null : new Date(ms).toISOString();
      }
    }
    return null;
  } catch {
    return null;
  }
};

const statsForFile = (
  label: BufferLabel,
  filePath: string,
): BufferFileStats => {
  const live = scanFile(filePath);
  const dead = scanFile(deadLetterPathFor(filePath));
  return {
    deadLetterLines: dead.lines,
    label,
    lines: live.lines,
    oldestAt: timestampOfLine(live.firstLine),
  };
};

/**
 * Snapshot of the telemetry buffers under `resolveTelemetryDir()`. Missing or
 * unreadable files count as zero; an unparsable first line yields a null
 * timestamp. Never throws.
 *
 * @public
 */
export const readBufferStats = (): BufferStats => {
  const files = [
    statsForFile('events', defaultJsonlPath()),
    statsForFile('outcomes', defaultOutcomesJsonlPath()),
    statsForFile('token-usage', defaultTokenUsageJsonlPath()),
    statsForFile('trajectories', defaultTrajectoriesJsonlPath()),
  ];
  const stamps = files
    .map((file) => file.oldestAt)
    .filter((at): at is string => at !== null)
    .sort();
  return {
    files,
    oldestAt: stamps[0] ?? null,
    totalDeadLetterLines: files.reduce((n, f) => n + f.deadLetterLines, 0),
    totalLines: files.reduce((n, f) => n + f.lines, 0),
  };
};
