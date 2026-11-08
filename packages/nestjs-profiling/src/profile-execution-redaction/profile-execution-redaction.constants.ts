/**
 * @description Default key-name fragments that mark a value as sensitive. Matching is
 * case-insensitive and substring-based, so `userPassword`, `access_token`, and
 * `Authorization` all match. Used to redact PII/secrets before profiling output is
 * written to disk or any other sink.
 */
export const DEFAULT_REDACTION_DENYLIST: readonly string[] = [
  'apikey',
  'authorization',
  'cookie',
  'credential',
  'email',
  'jwt',
  'password',
  'phone',
  'secret',
  'ssn',
  'token',
];

/** Placeholder substituted for any redacted value. */
export const REDACTED_PLACEHOLDER = '[REDACTED]';

/** Placeholder substituted when the configured max depth is exceeded. */
export const TRUNCATED_DEPTH_PLACEHOLDER = '[TRUNCATED:depth]';

/** Placeholder substituted when a string exceeds the configured max length. */
export const TRUNCATED_SIZE_PLACEHOLDER = '[TRUNCATED:size]';
