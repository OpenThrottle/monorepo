import type { FileHandle } from 'node:fs/promises';
import { open, stat } from 'node:fs/promises';
import * as path from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import {
  NESTJS_LOGGING_MODULE_OPTIONS,
  type ResolvedNestjsLoggingModuleOptions,
} from '../config/nestjs-logging.options';
import type {
  LogReplayChunk,
  LogStreamHub,
  StructuredLogRecord,
} from '../ports/logging-ports';
import { getActiveJsonlRelativePath } from './get-active-jsonl-relative-path';
import { parseJsonlLineToStructuredRecord } from './jsonl-payload';

const DEFAULT_MAX_REPLAY_BYTES = 256 * 1024;

/**
 * Parses complete UTF-8 lines from a byte slice; skips a leading partial line when {@link skipLeadingPartial} is true.
 */
const parseCompleteLinesFromBuffer = (
  buf: Buffer,
  skipLeadingPartial: boolean,
): ReadonlyArray<StructuredLogRecord> => {
  const out: StructuredLogRecord[] = [];
  let i = 0;

  if (skipLeadingPartial && buf.length > 0) {
    const firstNl = buf.indexOf(0x0a);

    if (firstNl === -1) {
      return out;
    }

    i = firstNl + 1;
  }

  while (i < buf.length) {
    const nl = buf.indexOf(0x0a, i);

    if (nl === -1) {
      break;
    }

    const line = buf.subarray(i, nl).toString('utf8');
    const rec = parseJsonlLineToStructuredRecord(line);

    if (rec !== undefined) {
      out.push(rec);
    }

    i = nl + 1;
  }

  return out;
};

/**
 * Next file byte offset after the last complete newline
 * consumed within {@link buf} when scanning from {@link startIndex} (0-based index in buf).
 */
const nextOffsetAfterCompleteLines = (
  fileOffset: number,
  buf: Buffer,
  startIndex: number,
): number => {
  let i = startIndex;

  while (i < buf.length) {
    const nl = buf.indexOf(0x0a, i);

    if (nl === -1) {
      return fileOffset + i;
    }

    i = nl + 1;
  }

  return fileOffset + i;
};

/**
 * In-process subscribers plus replay from the active JSONL file (tail / byte offset).
 */
@Injectable()
export class FileBackedLogStreamHub implements LogStreamHub {
  private readonly listeners = new Set<(record: StructuredLogRecord) => void>();

  constructor(
    @Inject(NESTJS_LOGGING_MODULE_OPTIONS)
    private readonly options: ResolvedNestjsLoggingModuleOptions,
  ) {}

  /**
   * Absolute path to the currently active JSONL file (same naming as {@link FileLogJsonlSink}).
   */
  private activeJsonlPath(): string {
    const relative = getActiveJsonlRelativePath(this.options);

    return path.join(this.options.logDirectory, relative);
  }

  private maxReplayBytes(): number {
    return this.options.maxReplayBytes ?? DEFAULT_MAX_REPLAY_BYTES;
  }

  publish(record: StructuredLogRecord): void {
    if (!this.options.levels.includes(record.level)) {
      return;
    }

    for (const listener of this.listeners) {
      try {
        listener(record);
      } catch {
        // Subscriber errors must not break logging.
      }
    }
  }

  subscribe(listener: (record: StructuredLogRecord) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  async readReplayTailLines(
    lineCount?: number,
  ): Promise<ReadonlyArray<StructuredLogRecord>> {
    const maxLines = Math.min(
      lineCount ?? this.options.maxReplayLines,
      this.options.maxReplayLines,
    );

    const fullPath = this.activeJsonlPath();

    let handle: FileHandle | undefined;

    try {
      try {
        await stat(fullPath);
      } catch {
        return [];
      }

      handle = await open(fullPath, 'r');

      const st = await handle.stat();
      const size = st.size;
      const maxBytes = this.maxReplayBytes();
      const readSize = Math.min(maxBytes, size);
      const start = Math.max(0, size - readSize);
      const buf = Buffer.alloc(readSize);

      await handle.read(buf, 0, readSize, start);

      const skipPartial = start > 0;
      const parsed = parseCompleteLinesFromBuffer(buf, skipPartial);

      return parsed.slice(Math.max(0, parsed.length - maxLines));
    } finally {
      await handle?.close();
    }
  }

  async readReplayFromByteOffset(byteOffset: number): Promise<LogReplayChunk> {
    if (byteOffset < 0) {
      return { nextByteOffset: 0, records: [] };
    }

    const fullPath = this.activeJsonlPath();
    let handle: FileHandle | undefined;

    try {
      handle = await open(fullPath, 'r');

      const st = await handle.stat();
      const size = st.size;

      if (byteOffset >= size) {
        return { nextByteOffset: size, records: [] };
      }

      const maxBytes = this.maxReplayBytes();
      const toRead = Math.min(maxBytes, size - byteOffset);
      const buf = Buffer.alloc(toRead);

      await handle.read(buf, 0, toRead, byteOffset);

      const skipLeadingPartial = byteOffset > 0;
      let lineStartInBuf = 0;

      if (skipLeadingPartial) {
        const firstNl = buf.indexOf(0x0a);

        if (firstNl === -1) {
          return { nextByteOffset: byteOffset, records: [] };
        }

        lineStartInBuf = firstNl + 1;
      }

      const slice = buf.subarray(lineStartInBuf);
      const lineStartOffset = byteOffset + lineStartInBuf;
      const records = parseCompleteLinesFromBuffer(slice, false);
      const nextByteOffset = nextOffsetAfterCompleteLines(
        lineStartOffset,
        slice,
        0,
      );

      return { nextByteOffset, records };
    } catch {
      return { nextByteOffset: byteOffset, records: [] };
    } finally {
      await handle?.close();
    }
  }
}
