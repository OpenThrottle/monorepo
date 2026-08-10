/**
 * Privacy seam — args truncation + secret redaction before an event ever leaves
 * the machine. Kept as a discrete unit so plan 91679bbf can extend it
 * (configurable privacy) without touching the rest of the core.
 */
import type { PrivacyLevel } from '../types';

/** @public */
export const PRIVACY_LEVELS: Readonly<Record<string, PrivacyLevel>> =
  Object.freeze({
    FULL: 'full',
    NAME_ONLY: 'name-only',
    TRUNCATED: 'truncated',
  });

/** @public */
export const DEFAULT_PRIVACY_LEVEL: PrivacyLevel = PRIVACY_LEVELS.TRUNCATED;

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
