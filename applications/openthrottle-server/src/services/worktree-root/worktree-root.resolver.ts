/**
 * @description The ONE implementation of worktree placement, mirroring `resolve_worktree_root` in
 * `skills/ot-worktree/scripts/root.sh`. Both the provisioning path and the discovery path (which has
 * to look where the script actually writes) consume this, so the settings page, the worker and the
 * repositories table can never disagree about where worktrees live.
 *
 * Two parts. First the ROOT — one directory holding every repo's worktrees:
 *   1. `env` — `OPENTHROTTLE_WORKTREE_ROOT` in this process's environment.
 *   2. `checkout-env` — `OPENTHROTTLE_WORKTREE_ROOT` in the target repo's `.env`, how a repo
 *      customizes where ITS worktrees go.
 *   3. `default` — `~/.openthrottle/worktrees`, mirrored in `.env.default`.
 *
 * Then OpenThrottle ALWAYS organizes beneath it as `<org>/<repo>`:
 *
 *     ~/.openthrottle/worktrees/acme/monorepo/feature-x
 *
 * The root is a root, not a final destination — the same shape `OPENTHROTTLE_CHECKOUT_ROOT` uses for
 * clones. Organizing unconditionally is what keeps the layout predictable: a configured root behaves
 * exactly like the default one.
 *
 * The org comes from the repo's git remote, not its directory name, so two checkouts of different
 * orgs' `monorepo` cannot land on one path. A repo with no remote falls back to its directory name.
 */

import { execFileSync } from 'node:child_process';

import { expandHome } from '../paths/expand-home';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, isAbsolute, join } from 'node:path';

/** Which rung of the ladder produced the resolved root. */
export const WORKTREE_ROOT_SOURCE = {
  CHECKOUT_ENV: 'checkout-env',
  DEFAULT: 'default',
  ENV: 'env',
} as const;

export type WorktreeRootSource =
  (typeof WORKTREE_ROOT_SOURCE)[keyof typeof WORKTREE_ROOT_SOURCE];

/**
 * The default worktree root under `$HOME`, matching `resolve_worktree_root` in
 * `skills/ot-worktree/scripts/root.sh` and the commented entry in `.env.default` (a test keeps all
 * three from drifting). A hidden directory OpenThrottle owns, deliberately outside every repo so
 * worktrees stay clear of the Nx workspace. `homedir()` is read at call time, not module load, so it
 * stays mockable.
 */
export const DEFAULT_WORKTREE_ROOT_RELATIVE_PATH = '.openthrottle/worktrees';

/** The env var name the script reads, and the name the provisioner forwards the setting under. */
export const WORKTREE_ROOT_ENV_VAR = 'OPENTHROTTLE_WORKTREE_ROOT';

export interface ResolveWorktreeRootParams {
  /** Absolute path of the checkout worktrees are created from. */
  readonly baseCheckoutPath: string;
  /**
   * This process's environment. Injected rather than read off `process.env` so the resolver stays
   * pure and testable.
   */
  readonly env?: NodeJS.ProcessEnv;
}

export interface ResolvedWorktreeRoot {
  /** Absolute, `~`-expanded, trailing-slash-free root directory. */
  readonly resolvedRoot: string;
  readonly source: WorktreeRootSource;
}

/**
 * @description Reduces one path segment to `[A-Za-z0-9._-]`, returning null for `.`, `..` or nothing
 * usable. Mirrors `_ot_safe_segment`: a hostile or malformed remote must not be able to walk out of
 * the root.
 */
const safeSegment = (value: string): string | null => {
  const replaced = value
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/^-+|-+$/g, '');
  return replaced === '' || replaced === '.' || replaced === '..'
    ? null
    : replaced;
};

/** The repo's `origin` remote, or null when it has none / is not a git repo. */
const readOriginRemote = (repoPath: string): string | null => {
  try {
    const output = execFileSync(
      'git',
      ['-C', repoPath, 'remote', 'get-url', 'origin'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 },
    ).trim();
    return output === '' ? null : output;
  } catch {
    return null;
  }
};

/**
 * @description `<org>/<repo>` for a checkout, or just `<repo>` when it has no usable remote.
 * Mirrors `_ot_repo_namespace`. Handles `https://host/org/repo.git`, `ssh://host/org/repo` and
 * `git@host:org/repo.git` by taking the last two `/`- or `:`-delimited segments.
 */
export const repositoryNamespace = (repoPath: string): string => {
  const fallback = safeSegment(basename(repoPath)) ?? 'repo';

  const remote = readOriginRemote(repoPath);
  if (remote === null) return fallback;

  const trimmed = remote.replace(/\.git$/, '').replace(/\/$/, '');
  const segments = trimmed.split(/[/:]/).filter((segment) => segment !== '');
  const repo =
    segments.length > 0 ? safeSegment(segments[segments.length - 1]) : null;
  const org =
    segments.length > 1 ? safeSegment(segments[segments.length - 2]) : null;

  if (org !== null && repo !== null) return `${org}/${repo}`;
  if (repo !== null) return repo;
  return fallback;
};

/** Strips trailing slashes the way the script's `${_root%/}` does, without emptying an absolute `/`. */
const stripTrailingSlashes = (value: string): string => {
  const stripped = value.replace(/\/+$/, '');
  return stripped === '' ? '/' : stripped;
};

/**
 * @description Reduces a raw `.env` right-hand side to its value, mirroring `_ot_dotenv_value` in
 * the script. A quoted value ends at its closing quote and anything after it is a comment; an
 * unquoted value ends at the first ` #`. Without the comment handling, `"~/wt" # where they go`
 * resolves to a directory literally named after the comment.
 */
const cleanEnvValue = (raw: string): string => {
  const withoutCr = raw.replace(/\r$/, '').trim();

  const quote = withoutCr.startsWith('"')
    ? '"'
    : withoutCr.startsWith("'")
      ? "'"
      : null;

  if (quote !== null) {
    const closing = withoutCr.indexOf(quote, 1);
    return closing === -1
      ? withoutCr.slice(1).trim()
      : withoutCr.slice(1, closing);
  }

  return withoutCr.replace(/\s+#.*$/, '').trim();
};

/**
 * @description Reads the LAST `OPENTHROTTLE_WORKTREE_ROOT=` assignment from a checkout's `.env`, matching the
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
 * decides whether to forward `OPENTHROTTLE_WORKTREE_ROOT` using exactly the test the ladder applies.
 */
export const normalizeWorktreeRootSetting = (
  value: string | null | undefined,
): string | null => {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * @description Resolves the directory `skills/ot-worktree/scripts/create.sh` would create a worktree under
 * for `baseCheckoutPath`, plus which rung of the ladder answered.
 * @throws Error when a configured value is not an absolute path once `~` is expanded — the script
 * fails the same way rather than creating a worktree somewhere relative to an unknown cwd.
 */
export const resolveWorktreeRoot = (
  params: ResolveWorktreeRootParams,
): ResolvedWorktreeRoot => {
  const { baseCheckoutPath, env = process.env } = params;

  const candidates: ReadonlyArray<
    readonly [WorktreeRootSource, string | null]
  > = [
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

  // OT always organizes beneath the root, whatever supplied it.
  const namespace = repositoryNamespace(baseCheckoutPath);

  for (const [source, value] of candidates) {
    if (value === null) continue;

    const expanded = expandHome(value);
    if (!isAbsolute(expanded)) {
      throw new Error(
        `worktree root must be an absolute path (got "${value}" from ${source})`,
      );
    }

    return {
      resolvedRoot: join(stripTrailingSlashes(expanded), namespace),
      source,
    };
  }

  return {
    resolvedRoot: join(
      homedir(),
      DEFAULT_WORKTREE_ROOT_RELATIVE_PATH,
      namespace,
    ),
    source: WORKTREE_ROOT_SOURCE.DEFAULT,
  };
};
