/**
 * @description Default replacement token written in place of redacted secret/PII values.
 */
export const DEFAULT_REDACTION_REPLACEMENT = '[REDACTED]' as const;

/**
 * @description Default deny-list of (case-insensitive) key-name substrings whose values are
 * always redacted in `extra` (recursively). Matches common credential/PII field names.
 */
export const DEFAULT_REDACTION_KEYS: readonly string[] = [
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'credential',
  'passwd',
  'password',
  'pwd',
  'secret',
  'session',
  'ssn',
  'token',
];

/**
 * @description Default value patterns; any string value (or substring) matching one of these
 * is redacted regardless of its key. Covers bearer/Basic auth, JWTs, and email addresses.
 */
export const DEFAULT_REDACTION_PATTERNS: readonly RegExp[] = [
  // Authorization scheme + credential (Bearer/Basic/Digest/Token …)
  /\b(?:bearer|basic|digest|token)\s+[\w.\-+/=]+/gi,
  // JSON Web Token (three base64url segments)
  /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g,
  // Email address
  /\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/gi,
];
