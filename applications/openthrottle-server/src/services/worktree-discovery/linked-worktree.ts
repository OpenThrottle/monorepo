/**
 * @description The on-disk predicates that decide whether a path is a live worktree. Shared so
 * discovery (which reports a registered checkout missing) and prune (which refuses to delete a live
 * one) can never disagree about the same path.
 */

import { statSync } from 'node:fs';
import { join } from 'node:path';

/** Whether the path is a directory that exists right now. Never throws. */
export const isExistingDirectory = (path: string): boolean => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

/** A linked worktree's `.git` is a FILE (`gitdir:` pointer); a real clone's is a directory. */
export const isLinkedWorktreeDirectory = (path: string): boolean => {
  try {
    if (!statSync(path).isDirectory()) return false;
    return statSync(join(path, '.git')).isFile();
  } catch {
    return false;
  }
};
