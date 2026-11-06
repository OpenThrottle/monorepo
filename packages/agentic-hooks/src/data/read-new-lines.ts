/**
 * Incremental append-only file reader that keeps each line's starting byte
 * offset. `readNewBytes` is the cheaper choice when only the lines matter; this
 * one exists for a caller that must resume a later read at the start of a
 * particular line. Knows paths and byte offsets and nothing about what the
 * lines contain.
 */
import fs from 'node:fs';

import { logHookError } from '../utils/logging.ts';

const NEWLINE = 0x0a;

/**
 * One complete, non-blank line and where it starts.
 *
 * @public
 */
export interface OffsetLine {
  /** Byte offset of the first byte of the line within the file. */
  readonly offset: number;
  readonly text: string;
}

/**
 * Result of one offset-keeping read.
 *
 * @public
 */
export interface ReadNewLinesResult {
  /** True when the read stopped at the cap with more complete data waiting. */
  readonly capped: boolean;
  readonly lines: readonly OffsetLine[];
  /** Just past the last COMPLETE line; equals the start offset if none. */
  readonly nextOffset: number;
}

/**
 * Read the complete lines appended to `filePath` at or after `offset`, each
 * with its starting byte offset. Same contract as `readNewBytes`: a line still
 * being written is not consumed, a file smaller than `offset` restarts at 0,
 * a single line longer than the cap is read whole, and a missing or unreadable
 * file yields nothing. Fail-open.
 *
 * @public
 */
export const readNewLines = ({
  filePath,
  maxBytes,
  offset,
}: {
  filePath: string;
  maxBytes: number;
  offset: number;
}): ReadNewLinesResult => {
  const unchanged: ReadNewLinesResult = {
    capped: false,
    lines: [],
    nextOffset: offset,
  };

  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, 'r');
    const { size } = fs.fstatSync(fd);
    const start = offset > size || offset < 0 ? 0 : offset;
    if (size === start) {
      return { capped: false, lines: [], nextOffset: start };
    }

    const remaining = size - start;
    let window = Math.min(remaining, Math.max(1, Math.floor(maxBytes)));
    let buffer = Buffer.alloc(0);
    let lastNewline = -1;
    while (lastNewline < 0) {
      buffer = Buffer.alloc(window);
      const bytesRead = fs.readSync(fd, buffer, 0, window, start);
      lastNewline = buffer.subarray(0, bytesRead).lastIndexOf(NEWLINE);
      if (window >= remaining) {
        break;
      }
      window = Math.min(remaining, window * 2);
    }
    if (lastNewline < 0) {
      return { capped: false, lines: [], nextOffset: start };
    }

    const lines: OffsetLine[] = [];
    let lineStart = 0;
    while (lineStart <= lastNewline) {
      const lineEnd = buffer.indexOf(NEWLINE, lineStart);
      const text = buffer
        .subarray(lineStart, lineEnd)
        .toString('utf8')
        .replace(/\r$/, '');
      if (text.trim() !== '') {
        lines.push({ offset: start + lineStart, text });
      }
      lineStart = lineEnd + 1;
    }

    const nextOffset = start + lastNewline + 1;
    return { capped: nextOffset < size, lines, nextOffset };
  } catch (err) {
    if (!(err instanceof Error && 'code' in err && err.code === 'ENOENT')) {
      logHookError('readNewLines failed', err);
    }
    return unchanged;
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {
        // swallow
      }
    }
  }
};
