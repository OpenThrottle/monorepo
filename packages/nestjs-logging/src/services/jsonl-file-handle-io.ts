import type { FileHandle } from 'node:fs/promises';

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
 * @description `fsync` the handle so prior writes are durable on disk.
 */
export async function flushFileHandle(fd: FileHandle): Promise<void> {
  await fd.sync();
}
