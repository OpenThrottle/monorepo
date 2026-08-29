import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * @description Expands a leading `~` in a user-supplied path against the current user's home
 * directory. Only a bare `~` or a leading `~/` expands; `~other/path` (another user's home) is
 * returned unchanged, because the shells and scripts this mirrors do not support it either.
 *
 * Configuration paths are written by humans in `.env` files, where `~` is the natural way to say
 * "my home". Node does not expand it — `isAbsolute('~/foo')` is `false` — so any check that
 * validates a configured path must expand first, or it silently rejects the value people write.
 *
 * Lives in the server app, NOT in a shared package: it imports `node:os`, and the shared utility
 * packages are barrel-exported into browser bundles. A single `node:os` import in one of those
 * barrels breaks the developer app at runtime for every client module that touches it.
 *
 * `homedir()` is read at call time, not module load, so it stays mockable in tests.
 */
export const expandHome = (value: string): string => {
  if (value === '~') return homedir();
  if (value.startsWith('~/')) return join(homedir(), value.slice(2));
  return value;
};
