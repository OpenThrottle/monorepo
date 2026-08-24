/**
 * @description The ONE implementation of the worktree-root resolution ladder, mirroring
 * `resolve_worktree_root` in `scripts/create_worktree.sh`. Both the provisioning path (which
 * forwards the answer to the script as `OT_WORKTREE_ROOT`) and the discovery path (which has to
 * look in the directory the script actually writes to) consume this, so the settings page, the
 * worker, and the repositories table can never disagree about where worktrees live.
 *
 * Ladder, highest rung wins:
 *   1. `settings` — the workspace-level `user_workspace_settings.worktree_root` value.
 *   2. `env` — `OT_WORKTREE_ROOT` in this process's environment (one-off overrides).
 *   3. `checkout-env` — `OT_WORKTREE_ROOT` in the base checkout's `.env`.
 *   4. `default` — the sibling `openthrottle-worktrees` directory next to the base checkout.
 *
 * Rungs 1 and 2 are one rung in the shell script (the provisioner forwards the setting AS the env
 * var), split here only so callers can report which of the two supplied the value.
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';

/** Which rung of the ladder produced the resolved root. */
export const WORKTREE_ROOT_SOURCE = {
  CHECKOUT_ENV: 'checkout-env',
  DEFAULT: 'default',
  ENV: 'env',
  SETTINGS: 'settings',
} as const;

export type WorktreeRootSource =
  (typeof WORKTREE_ROOT_SOURCE)[keyof typeof WORKTREE_ROOT_SOURCE];

/** The directory name the shell script falls back to; kept in one place so the two cannot drift. */
export const DEFAULT_WORKTREE_ROOT_DIRECTORY_NAME = 'openthrottle-worktrees';

/** The env var name the script reads, and the name the provisioner forwards the setting under. */
export const WORKTREE_ROOT_ENV_VAR = 'OT_WORKTREE_ROOT';

export interface ResolveWorktreeRootParams {
  /** Absolute path of the checkout worktrees are created from. */
  readonly baseCheckoutPath: string;
  /**
   * This process's environment. Injected rather than read off `process.env` so the resolver stays
   * pure and testable.
   */
  readonly env?: NodeJS.ProcessEnv;
  /** The configured `user_workspace_settings.worktree_root`, if the user set one. */
  readonly settingsWorktreeRoot?: string | null;
}

export interface ResolvedWorktreeRoot {
  /** Absolute, `~`-expanded, trailing-slash-free root directory. */
  readonly resolvedRoot: string;
  readonly source: WorktreeRootSource;
}

/**
 * @description Expands a leading `~` against the current user's home directory, matching the
 * script's `case "$_root" in "~") ... "~/"*) ...` handling. Only a leading `~` or `~/` expands —
 * `~other/path` (another user's home) is not supported by the script either.
 */
const expandHome = (value: string): string => {
  if (value === '~') return homedir();
  if (value.startsWith('~/')) return join(homedir(), value.slice(2));
  return value;
};

/** Strips trailing slashes the way the script's `${_root%/}` does, without emptying an absolute `/`. */
const stripTrailingSlashes = (value: string): string => {
  const stripped = value.replace(/\/+$/, '');
  return stripped === '' ? '/' : stripped;
};

/** Trims, unquotes and strips a trailing CR from a raw `.env` value, as the script's `sed` chain does. */
const cleanEnvValue = (raw: string): string => {
  const withoutCr = raw.replace(/\r$/, '').trim();
  const unquoted =
    (withoutCr.startsWith('"') && withoutCr.endsWith('"')) ||
    (withoutCr.startsWith("'") && withoutCr.endsWith("'"))
      ? withoutCr.slice(1, -1)
      : withoutCr;
  return unquoted.trim();
};

/**
 * @description Reads the LAST `OT_WORKTREE_ROOT=` assignment from a checkout's `.env`, matching the
 * script's `sed -n 's/^...//p' | tail -n 1`. Returns null when the file is absent or unreadable —
 * a missing `.env` is the common case, not an error.
 */
const readCheckoutEnvWorktreeRoot = (
  baseCheckoutPath: string,
): string | null => {
  let contents: string;
  try {
    contents = readFileSync(join(baseCheckoutPath, '.env'), 'utf-8');
  } catch {
    return null;
  }

  const pattern = new RegExp(`^\\s*${WORKTREE_ROOT_ENV_VAR}\\s*=\\s*(.*)$`);
  let last: string | null = null;
  for (const line of contents.split(/\r?\n/)) {
    const match = pattern.exec(line);
    if (match !== null) {
      last = cleanEnvValue(match[1]);
    }
  }

  return last === null || last === '' ? null : last;
};

/**
 * @description Normalizes a configured worktree-root value to the string worth acting on, or null
 * when it is absent or blank ("blank means use the default"). Exported so the provisioning path
 * decides whether to forward `OT_WORKTREE_ROOT` using exactly the test the ladder applies.
 */
export const normalizeWorktreeRootSetting = (
  value: string | null | undefined,
): string | null => {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * @description Resolves the directory `scripts/create_worktree.sh` would create a worktree under
 * for `baseCheckoutPath`, plus which rung of the ladder answered.
 * @throws Error when a configured value is not an absolute path once `~` is expanded — the script
 * fails the same way rather than creating a worktree somewhere relative to an unknown cwd.
 */
export const resolveWorktreeRoot = (
  params: ResolveWorktreeRootParams,
): ResolvedWorktreeRoot => {
  const { baseCheckoutPath, env = process.env, settingsWorktreeRoot } = params;

  const candidates: ReadonlyArray<
    readonly [WorktreeRootSource, string | null]
  > = [
    [
      WORKTREE_ROOT_SOURCE.SETTINGS,
      normalizeWorktreeRootSetting(settingsWorktreeRoot),
    ],
    [
      WORKTREE_ROOT_SOURCE.ENV,
      normalizeWorktreeRootSetting(env[WORKTREE_ROOT_ENV_VAR]),
    ],
    [
      WORKTREE_ROOT_SOURCE.CHECKOUT_ENV,
      normalizeWorktreeRootSetting(
        readCheckoutEnvWorktreeRoot(baseCheckoutPath),
      ),
    ],
  ];

  for (const [source, value] of candidates) {
    if (value === null) continue;

    const expanded = expandHome(value);
    if (!isAbsolute(expanded)) {
      throw new Error(
        `worktree root must be an absolute path (got "${value}" from ${source})`,
      );
    }

    return { resolvedRoot: stripTrailingSlashes(expanded), source };
  }

  return {
    resolvedRoot: stripTrailingSlashes(
      join(dirname(baseCheckoutPath), DEFAULT_WORKTREE_ROOT_DIRECTORY_NAME),
    ),
    source: WORKTREE_ROOT_SOURCE.DEFAULT,
  };
};
