/**
 * Privacy seam — args truncation + secret redaction before an event ever leaves
 * the machine. Kept as a discrete unit so plan 91679bbf can extend it
 * (configurable privacy) without touching the rest of the core.
 *
 * The level is chosen from the checkout rather than being a fixed constant:
 * `truncated` in an OpenThrottle checkout, `name-only` in a repo the operator
 * does not own.
 */
import {
  isOpenThrottleCheckout,
  readUserEnvFile,
  resolveRepoIdentity,
} from '../config/env.ts';
import type { PrivacyLevel } from '../types.ts';
import { normalizeRemoteUrl } from './normalizeRemoteUrl.ts';

/** @public */
export const PRIVACY_LEVELS = Object.freeze({
  FULL: 'full',
  NAME_ONLY: 'name-only',
  TRUNCATED: 'truncated',
} as const) satisfies Readonly<Record<string, PrivacyLevel>>;

/** The OpenThrottle-checkout default: args redacted and capped. @public */
export const DEFAULT_PRIVACY_LEVEL: PrivacyLevel = PRIVACY_LEVELS.TRUNCATED;

/** The foreign-checkout default: no args at all. @public */
export const FOREIGN_PRIVACY_LEVEL: PrivacyLevel = PRIVACY_LEVELS.NAME_ONLY;

/**
 * The `~/.openthrottle/.env` key listing foreign repos opted in to `truncated`.
 * Read ONLY from the user-global file, never `process.env`: a foreign repo can
 * set its own shell environment (direnv, mise, devcontainers), so an env value
 * would be a value the repo could set on itself.
 *
 * @public
 */
export const TRUNCATED_REPOS_ENV_KEY = `OPENTHROTTLE_TELEMETRY_TRUNCATED_REPOS`;

/**
 * The parsed opt-in list: `repos` are normalized remotes, `invalid` the raw
 * entries that did not normalize (they match nothing).
 *
 * @public
 */
export interface TruncatedRepoOptIns {
  readonly invalid: readonly string[];
  readonly repos: readonly string[];
}

/**
 * Parse the per-repo opt-in line from `~/.openthrottle/.env`. Comma-separated,
 * whitespace-tolerant; each entry goes through `normalizeRemoteUrl`. Fails
 * closed: any error yields an empty list.
 *
 * @public
 */
export const readTruncatedRepoOptIns = (): TruncatedRepoOptIns => {
  try {
    const raw = readUserEnvFile()[TRUNCATED_REPOS_ENV_KEY] ?? '';
    const repos: string[] = [];
    const invalid: string[] = [];
    for (const entry of raw.split(',')) {
      const trimmed = entry.trim();
      if (trimmed === '') {
        continue;
      }
      const normalized = normalizeRemoteUrl(trimmed);
      if (normalized === null) {
        invalid.push(trimmed);
      } else if (!repos.includes(normalized)) {
        repos.push(normalized);
      }
    }
    return { invalid, repos };
  } catch {
    return { invalid: [], repos: [] };
  }
};

const isOptedInForeignRepo = (repoRoot: string | undefined): boolean => {
  if (!repoRoot) {
    return false;
  }
  try {
    const identity = resolveRepoIdentity(repoRoot);
    return (
      identity !== null && readTruncatedRepoOptIns().repos.includes(identity)
    );
  } catch {
    return false;
  }
};

/**
 * The privacy level for `repoRoot`, from the same checkout test that gates the
 * `.env` layer — so a repo is either ours for both purposes or neither.
 *
 * The asymmetry is about consent, not about the redactor's quality: in this
 * repo the operator owns the code the args are drawn from; in someone else's
 * they do not, and skill args routinely quote file contents, paths and prompt
 * text belonging to a third party. `name-only` is also what makes the plugin
 * defensible to install — "it records which skills ran, never what you typed"
 * is a claim a user can check by reading the payload's README, which has
 * advertised exactly that since before anything selected it.
 *
 * A foreign repo whose normalized remote is listed in
 * `OPENTHROTTLE_TELEMETRY_TRUNCATED_REPOS` (user-global file only) is raised to
 * `truncated`; the secret redactor still runs. A repo without a remote is never
 * opted in.
 *
 * Fails closed with `isOpenThrottleCheckout`: an unreadable root collects no
 * args.
 *
 * @public
 */
export const resolvePrivacyLevel = (
  repoRoot: string | undefined,
): PrivacyLevel => {
  if (isOpenThrottleCheckout(repoRoot) || isOptedInForeignRepo(repoRoot)) {
    return DEFAULT_PRIVACY_LEVEL;
  }
  return FOREIGN_PRIVACY_LEVEL;
};

/** @public */
export const DEFAULT_ARGS_MAX_LEN = 256;

const SECRET_PATTERNS: readonly RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._\-+=/]+/gi,
  /\bsk-[A-Za-z0-9]{8,}/gi,
  /\b(password|passwd|pwd|secret|token|api[_-]?key)\s*[=:]\s*\S+/gi,
  /\bAIza[0-9A-Za-z\-_]{20,}/gi,
  /\bghp_[A-Za-z0-9]{20,}/gi,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/gi,
];

/**
 * Redact known secret shapes from a string.
 *
 * @public
 */
export const redactSecrets = (value: string): string => {
  let out = value;
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    out = out.replace(pattern, '[REDACTED]');
  }
  return out;
};

const stringifyArgs = (args: unknown): string => {
  if (args == null) {
    return '';
  }
  if (typeof args === 'string') {
    return args;
  }
  try {
    return JSON.stringify(args);
  } catch {
    return String(args);
  }
};

/**
 * Apply the privacy level to raw args. `name-only` drops args entirely; `full`
 * keeps redacted args; `truncated` (default) additionally caps length.
 *
 * @public
 */
export const applyPrivacy = (
  level: PrivacyLevel,
  args: unknown,
  options: { maxLen?: number } = {},
): string | null => {
  const maxLen = options.maxLen ?? DEFAULT_ARGS_MAX_LEN;
  if (level === PRIVACY_LEVELS.NAME_ONLY) {
    return null;
  }

  const asString = stringifyArgs(args);

  const redacted = redactSecrets(asString);

  if (level === PRIVACY_LEVELS.FULL) {
    return redacted;
  }

  // Default / truncated
  if (redacted.length <= maxLen) {
    return redacted;
  }
  return `${redacted.slice(0, maxLen)}…`;
};
