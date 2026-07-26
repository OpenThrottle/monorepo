/**
 * @description Capability-driven worktree flag formatting shared by driver command builders.
 * Generalizes tools/workflows' `appendRalphWorktreeShellFlags`: the base `-w` / `--worktree` flag is
 * emitted whenever a driver advertises `capabilities.worktree`, and the Cursor-only extras
 * (`--worktree-base`, `--skip-worktree-setup`) are gated on `capabilities.worktreeBase` /
 * `capabilities.skipWorktreeSetup` instead of a hardcoded backend check.
 */

import type {
  DriverCapabilities,
  DriverWorktreeOptions,
} from '../types/index.ts';
import { escapeShellArg, WORKTREE_FLAG_ONLY } from './shell.ts';

/**
 * @description Appends worktree shell flags to a base command. Returns the command unchanged when
 * the driver has no worktree capability or no worktree option was provided. `worktree: ''`
 * (see {@link WORKTREE_FLAG_ONLY}) emits `-w` with no name.
 * @public
 */
export const appendWorktreeShellFlags = (
  command: string,
  capabilities: DriverCapabilities,
  worktree: DriverWorktreeOptions | undefined,
): string => {
  if (!capabilities.worktree || worktree?.worktree === undefined) {
    return command;
  }

  const parts: string[] = [];
  const name = worktree.worktree;

  if (name === WORKTREE_FLAG_ONLY) {
    parts.push('-w');
  } else {
    parts.push('-w', escapeShellArg(name));
  }

  if (capabilities.worktreeBase) {
    const base = worktree.worktreeBase?.trim();
    if (base !== undefined && base !== '') {
      parts.push('--worktree-base', escapeShellArg(base));
    }
  }

  if (capabilities.skipWorktreeSetup && worktree.skipWorktreeSetup === true) {
    parts.push('--skip-worktree-setup');
  }

  return `${command} ${parts.join(' ')}`;
};
