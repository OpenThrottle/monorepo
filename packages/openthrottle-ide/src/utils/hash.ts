import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

/** Hash algorithm used for content fingerprints. */
const HASH_ALGORITHM = 'sha256';

/**
 * Compute a stable content fingerprint for a string. Used to detect whether a
 * file's contents have changed between scans (the foundation for incremental,
 * Merkle-style re-indexing).
 *
 * @public
 */
export function hashContent(content: string): string {
  return createHash(HASH_ALGORITHM).update(content).digest('hex');
}

/**
 * Compute a content fingerprint for a file by streaming it, so large files do
 * not have to be held in memory.
 *
 * @public
 */
export async function hashFile(absolutePath: string): Promise<string> {
  const hash = createHash(HASH_ALGORITHM);
  const stream = createReadStream(absolutePath);

  return new Promise<string>((resolvePromise, rejectPromise) => {
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolvePromise(hash.digest('hex')));
    stream.on('error', rejectPromise);
  });
}
