/**
 * Privacy seam — args truncation + secret redaction before an event ever leaves
 * the machine. Kept as a discrete unit so plan 91679bbf can extend it
 * (configurable privacy) without touching the rest of the core.
 *
 * The level is chosen from the repo profile rather than being a fixed constant:
 * `truncated` at home, `name-only` in a repo the operator does not own.
 */
import { REPO_PROFILES, resolveRepoProfile } from '../config/profile';
import type { PrivacyLevel } from '../types';

/** @public */
export const PRIVACY_LEVELS = Object.freeze({
  FULL: 'full',
  NAME_ONLY: 'name-only',
  TRUNCATED: 'truncated',
} as const) satisfies Readonly<Record<string, PrivacyLevel>>;

/** The `home` default: args redacted and capped. @public */
export const DEFAULT_PRIVACY_LEVEL: PrivacyLevel = PRIVACY_LEVELS.TRUNCATED;

/** The `foreign` default: no args at all. @public */
export const FOREIGN_PRIVACY_LEVEL: PrivacyLevel = PRIVACY_LEVELS.NAME_ONLY;

/**
 * The privacy level for a repo, from its profile.
 *
 * The asymmetry is about consent, not about the redactor's quality: in this
 * repo the operator owns the code the args are drawn from; in someone else's
 * they do not, and skill args routinely quote file contents, paths and prompt
 * text belonging to a third party. `name-only` is also what makes the plugin
 * defensible to install — "it records which skills ran, never what you typed"
 * is a claim a user can check by reading the payload's README.
 *
 * Raising a foreign repo to `truncated`/`full` is an explicit opt-in in the
 * operator's own machine-global config; it is never inferable from the repo.
 * See `docs/monorepo/child-repo-hook-telemetry-contract.md` §6.
 *
 * @public
 */
export const resolvePrivacyLevel = (repoRoot: string): PrivacyLevel =>
  resolveRepoProfile(repoRoot) === REPO_PROFILES.FOREIGN
    ? FOREIGN_PRIVACY_LEVEL
    : DEFAULT_PRIVACY_LEVEL;

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

  const asString =
    args == null
      ? ''
      : typeof args === 'string'
        ? args
        : (() => {
            try {
              return JSON.stringify(args);
            } catch {
              return String(args);
            }
          })();

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
