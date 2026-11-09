import { existsSync, statSync } from 'node:fs';
import { isAbsolute } from 'node:path';

import { toContainerPath } from '@openthrottle/openthrottle-agentic-utils';
/**
 * @description The ONE parser for `git worktree list --porcelain` output. Shared by the checkout
 * inspection snapshot and by worktree discovery so the two can never disagree about which paths
 * count as linked worktrees.
 */

/**
 * @description Linked-worktree paths from `git worktree list --porcelain`, main worktree excluded.
 * git always lists the main worktree first, so it is dropped; a null/empty output yields [].
 */
export const parseLinkedWorktrees = (output: string | null): string[] => {
  if (output === null) return [];
  return (
    output
      .split('\n')
      .filter((line) => line.startsWith('worktree '))
      .map((line) => line.slice('worktree '.length).trim())
      .filter((path) => path !== '')
      // git lists the main worktree first; only the linked ones matter.
      .slice(1)
  );
};
const MAX_PATH_LENGTH = 4096;

/**
 * Validates a path before any filesystem access: absolute, sane length, no
 * NUL bytes, exists, and is a directory — the validateWorkingDirectory-style
 * checks from the design doc §6. Comparison happens in this process's view
 * (toContainerPath); the returned value is the resolved, process-view path.
 */
export const validateInspectionPath = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed.includes('\0')) {
    throw new Error('inspection path is empty or contains invalid characters');
  }
  if (trimmed.length > MAX_PATH_LENGTH) {
    throw new Error(
      `inspection path must be at most ${MAX_PATH_LENGTH} characters`,
    );
  }
  if (!isAbsolute(trimmed)) {
    throw new Error('inspection path must be an absolute path');
  }

  const resolved = toContainerPath(trimmed);
  if (!existsSync(resolved)) {
    throw new Error(`inspection path does not exist: ${trimmed}`);
  }
  if (!statSync(resolved).isDirectory()) {
    throw new Error(`inspection path is not a directory: ${trimmed}`);
  }

  return resolved;
};
