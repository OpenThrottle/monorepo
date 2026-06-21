import type { FileHandle } from 'node:fs/promises';
import type { JsonlDurabilityLevel } from '../config/nestjs-logging.options';

/**
 * @description Append UTF-8 text to an open append-mode {@link FileHandle}.
 */
export async function appendUtf8ToFileHandle(
  fd: FileHandle,
  utf8: string,
): Promise<void> {
  const buf = Buffer.from(utf8, 'utf8');

  await fd.write(buf, 0, buf.length, null);
}

/**
 * @description Flush the handle to the requested {@link JsonlDurabilityLevel}.
 *
 * - `'none'`: no fsync; rely on the OS page cache to write back. Cheapest, least durable.
 * - `'datasync'`: `fdatasync` — flushes file data (and metadata required to read it back) but not
 *   all inode metadata (e.g. mtime). Cheaper than a full fsync under high write throughput.
 * - `'sync'`: `fsync` — flushes data and all metadata. Most durable, most expensive.
 *
 * On a hot log file flushed every interval, a full `fsync` can add measurable I/O stalls; prefer
 * `'datasync'` (or `'none'`) when interval durability of inode metadata is not required.
 */
export async function flushFileHandle(
  fd: FileHandle,
  durability: JsonlDurabilityLevel,
): Promise<void> {
  if (durability === 'none') {
    return;
  }

  if (durability === 'datasync') {
    await fd.datasync();

    return;
  }

  await fd.sync();
}
