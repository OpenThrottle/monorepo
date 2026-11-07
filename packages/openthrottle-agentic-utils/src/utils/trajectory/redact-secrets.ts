/**
 * @description Secret redaction for trajectory step text. Same pattern set as
 * `@openthrottle/agentic-hooks` `redactSecrets` — keep them in lockstep when either changes.
 */

const SECRET_PATTERNS: readonly RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._\-+=/]+/gi,
  /\bsk-[A-Za-z0-9]{8,}/gi,
  /\b(password|passwd|pwd|secret|token|api[_-]?key)\s*[=:]\s*\S+/gi,
  /\bAIza[0-9A-Za-z\-_]{20,}/gi,
  /\bghp_[A-Za-z0-9]{20,}/gi,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/gi,
];

/**
 * @description Redact known secret shapes from trajectory message text.
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
