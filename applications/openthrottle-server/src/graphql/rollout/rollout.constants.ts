/** Shared subject when neither auth nor anonymousId is present. */
export const ROLLOUT_DEGRADED_ANONYMOUS_SUB =
  '00000000-0000-4000-8000-000000000000' as const;

/**
 * @description Canonical hyphenated UUID shape, any version or variant — what
 * Postgres' `uuid` input accepts in the form clients send. Deliberately not
 * version-pinned, so uuidv7 ids pass.
 */
export const ROLLOUT_ANONYMOUS_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
