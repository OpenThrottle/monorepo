/**
 * @description Symlink resolution shared by every service that has to decide whether two paths are
 * the same place on disk. A registered checkout stored as `/Users/x/dev/repo` and a caller cwd of
 * `/private/var/.../repo` are the same directory on macOS, and only `realpathSync` says so.
 *
 * Total by construction: a path whose target no longer exists resolves to itself rather than
 * throwing, so callers can compare a stale or not-yet-created path without a try/catch of their own.
 */

import { realpathSync } from 'node:fs';

export const realPath = (value: string): string => {
  try {
    return realpathSync(value);
  } catch {
    return value;
  }
};
