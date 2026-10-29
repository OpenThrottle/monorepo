/**
 * Incremental append-only file reader. Knows file paths and byte offsets and
 * nothing about what the lines contain, so any producer's transcript can use it.
 */
import fs from 'node:fs';

import { logHookError } from '../utils/logging.ts';

const NEWLINE = 0x0a;

/**
 * Result of one incremental read: the complete new lines (blank lines dropped)
 * and the offset to resume from next time.
 *
 * @public
 */
export interface ReadNewBytesResult {
  readonly lines: readonly string[];
  /** Just past the last COMPLETE line; equals the start offset if none. */
  readonly nextOffset: number;
}

/**
 * Read the complete lines appended to `filePath` at or after `offset`.
 *
 * A line still being written (no terminating newline yet) is NOT consumed:
 * `nextOffset` stops before it, so the next call re-reads it once it is whole.
 * A file smaller than `offset` was truncated or replaced, so the read restarts
 * at 0. Offsets are bytes, and lines are split on the newline byte before
 * decoding, so multi-byte characters can never be cut in half. A missing or
 * unreadable file yields no lines and an unchanged offset. Fail-open.
 *
 * @public
 */
export const readNewBytes = ({
  filePath,
  offset,
}: {
  filePath: string;
  offset: number;
}): ReadNewBytesResult => {
  const unchanged: ReadNewBytesResult = { lines: [], nextOffset: offset };

  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, 'r');
    const { size } = fs.fstatSync(fd);
    const start = offset > size || offset < 0 ? 0 : offset;
    if (size === start) {
      return { lines: [], nextOffset: start };
    }

    const buffer = Buffer.alloc(size - start);
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, start);
    const lastNewline = buffer.subarray(0, bytesRead).lastIndexOf(NEWLINE);
    if (lastNewline < 0) {
      return { lines: [], nextOffset: start };
    }

    const lines = buffer
      .subarray(0, lastNewline)
      .toString('utf8')
      .split('\n')
      .map((line) => line.replace(/\r$/, ''))
      .filter((line) => line.trim() !== '');
    return { lines, nextOffset: start + lastNewline + 1 };
  } catch (err) {
    if (!(err instanceof Error && 'code' in err && err.code === 'ENOENT')) {
      logHookError('readNewBytes failed', err);
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
