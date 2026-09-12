/**
 * Repo classification — the one binary decision every other foreign-repo rule
 * keys off. See `docs/monorepo/child-repo-hook-telemetry-contract.md` §1–§4.
 *
 * A repo is `home` when its root carries OT's own marker (this monorepo, or a
 * worktree of it). Everything else is `foreign`, and gets the restricted
 * profile: no reading the checkout's `.env`, no writing inside the checkout,
 * and no skill arguments in the telemetry.
 *
 * The check is a filesystem test on the resolved repo root, deliberately — the
 * endpoint and the branch are exactly the things we are deciding whether to
 * trust, so neither can be an input to the decision.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** @public */
export const REPO_PROFILES = Object.freeze({
  FOREIGN: 'foreign',
  HOME: 'home',
} as const);

/** @public */
export type RepoProfile = (typeof REPO_PROFILES)[keyof typeof REPO_PROFILES];

/**
 * The marker that identifies this monorepo. A committed, OT-specific file at
 * the repo root, so a worktree of the monorepo is `home` too and an unrelated
 * checkout cannot become `home` by accident.
 */
const HOME_MARKER = '.openthrottle.mjs';

/**
 * Classify the repo at `repoRoot`.
 *
 * Fails **closed**, not open: any error resolves to `foreign`. The failure mode
 * matters here in a way it does not elsewhere in this package — every other
 * fail-open path gives up on telemetry, whereas guessing `home` wrongly would
 * read a stranger's `.env` and write into their working tree. An unreadable
 * root is a reason to be more careful, not less.
 *
 * @public
 */
export const resolveRepoProfile = (repoRoot: string): RepoProfile => {
  try {
    return fs.existsSync(path.join(repoRoot, HOME_MARKER))
      ? REPO_PROFILES.HOME
      : REPO_PROFILES.FOREIGN;
  } catch {
    return REPO_PROFILES.FOREIGN;
  }
};

/**
 * Normalize a git remote URL to a stable cross-machine identity: scheme and
 * credentials dropped, `.git` suffix dropped, host lowercased. The path is left
 * alone — forge path segments are case-sensitive on some hosts, and folding
 * them would merge two genuinely different repos.
 *
 * Handles both URL forms git emits: `scheme://[creds@]host/path` and the
 * scp-like `[user@]host:path`.
 */
const normalizeRemoteUrl = (remote: string): string | null => {
  let rest = remote.trim();
  if (!rest) {
    return null;
  }

  // scheme://
  const schemeEnd = rest.indexOf('://');
  if (schemeEnd !== -1) {
    rest = rest.slice(schemeEnd + 3);
  }

  // [user[:password]@]host
  const at = rest.lastIndexOf('@');
  if (at !== -1) {
    rest = rest.slice(at + 1);
  }

  // scp-like `host:path` → `host/path`. Only when the part after the colon is
  // not a port number, so `host:22/path` is left for the split below.
  const colon = rest.indexOf(':');
  if (colon !== -1) {
    const after = rest.slice(colon + 1);
    rest = /^\d+(\/|$)/.test(after)
      ? `${rest.slice(0, colon)}${after.replace(/^\d+/, '')}`
      : `${rest.slice(0, colon)}/${after}`;
  }

  rest = rest.replace(/\.git$/, '').replace(/\/+$/, '');
  const slash = rest.indexOf('/');
  if (slash === -1) {
    return rest.toLowerCase() || null;
  }
  return `${rest.slice(0, slash).toLowerCase()}${rest.slice(slash)}`;
};

/**
 * Per-process memo. Resolving the identity shells out to `git`, and the buffer
 * paths that need it are recomputed a dozen times across a single hook (starts,
 * persist, drain). A hook runs on the critical path of a tool call, so paying
 * for one subprocess instead of twelve is the difference between invisible and
 * noticeable. A hook process is short-lived and single-repo, so an unbounded
 * Map cannot grow.
 */
const identityCache = new Map<string, string | null>();

/**
 * The foreign repo's identity for telemetry: its normalized git remote URL.
 *
 * Returns null when the repo has no remote. A local scratch checkout reports NO
 * identity rather than falling back to its path — paths are per-machine, differ
 * across a container bridge, and would leak the user's home directory layout
 * into someone else's telemetry.
 *
 * @public
 */
export const resolveRepoIdentity = (repoRoot: string): string | null => {
  const cached = identityCache.get(repoRoot);
  if (cached !== undefined) {
    return cached;
  }
  const resolved = readRepoIdentity(repoRoot);
  identityCache.set(repoRoot, resolved);
  return resolved;
};

const readRepoIdentity = (repoRoot: string): string | null => {
  try {
    const remote = execFileSync(
      'git',
      ['config', '--get', 'remote.origin.url'],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 2000,
      },
    ).trim();
    return remote ? normalizeRemoteUrl(remote) : null;
  } catch {
    return null;
  }
};

/** Machine-global root for everything this package stores outside a repo. */
const openThrottleHome = (): string => path.join(os.homedir(), '.openthrottle');

/**
 * Where a foreign repo's buffers live: a machine-global directory, one subtree
 * per repo, keyed by a hash.
 *
 * Hashed rather than named, following `foreign-skill-ledgers` (the established
 * convention for exactly this problem): it is filesystem-safe for any input,
 * stable across runs, and cannot smuggle a path or a remote URL into a filename.
 * The key falls back to the repo path when there is no remote — that is a local
 * directory name, never telemetry, so §3's "no path-derived identity" rule is
 * about the wire and is not weakened here.
 *
 * @public
 */
export const foreignStateDir = (repoRoot: string): string => {
  const key = resolveRepoIdentity(repoRoot) ?? repoRoot;
  const hash = createHash('sha256').update(key).digest('hex').slice(0, 32);
  return path.join(openThrottleHome(), 'skill-usage', hash);
};

/**
 * Operator's machine-global hook config, the leg-A endpoint source: a
 * marketplace-installed plugin has no spawning parent to inherit an endpoint
 * from, so the user writes it once here.
 *
 * @public
 */
export const OPERATOR_CONFIG_PATH_REL = 'hooks.json';

/**
 * Read `~/.openthrottle/hooks.json`. Returns an empty object when absent or
 * unreadable — a missing operator config is the normal state, not an error.
 *
 * @public
 */
export const readOperatorConfig = (): Record<string, unknown> => {
  try {
    const raw = fs.readFileSync(
      path.join(openThrottleHome(), OPERATOR_CONFIG_PATH_REL),
      'utf8',
    );
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? { ...parsed }
      : {};
  } catch {
    return {};
  }
};
