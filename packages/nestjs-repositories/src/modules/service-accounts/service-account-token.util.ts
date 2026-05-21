/**
 * @description Parsing and formatting for service account bearer tokens (`ot_sa_<prefix>_<secret>`).
 */

import { timingSafeEqual } from 'node:crypto';

/** Prefix on the full bearer token (after `Bearer `). */
export const SERVICE_ACCOUNT_BEARER_PREFIX = 'ot_sa_' as const;

const TOKEN_BODY_PATTERN = /^[a-zA-Z0-9]+$/;

/**
 * @description Strips an optional `Bearer ` prefix and returns the token body, or null if not a service account token.
 */
export function normalizeServiceAccountBearerToken(
  authorizationOrToken: string,
): string | null {
  const trimmed = authorizationOrToken.trim();
  const token = trimmed.toLowerCase().startsWith('bearer ')
    ? trimmed.slice(7).trim()
    : trimmed;
  if (!token.startsWith(SERVICE_ACCOUNT_BEARER_PREFIX)) {
    return null;
  }
  return token;
}

/**
 * @description Splits `ot_sa_<prefix>_<secret>` into lookup prefix and plaintext secret.
 */
export function parseServiceAccountToken(
  token: string,
): { prefix: string; secret: string } | null {
  if (!token.startsWith(SERVICE_ACCOUNT_BEARER_PREFIX)) {
    return null;
  }
  const remainder = token.slice(SERVICE_ACCOUNT_BEARER_PREFIX.length);
  const separatorIndex = remainder.indexOf('_');
  if (separatorIndex <= 0) {
    return null;
  }
  const prefix = remainder.slice(0, separatorIndex);
  const secret = remainder.slice(separatorIndex + 1);
  if (!prefix || !secret) {
    return null;
  }
  if (!TOKEN_BODY_PATTERN.test(prefix) || !TOKEN_BODY_PATTERN.test(secret)) {
    return null;
  }
  return { prefix, secret };
}

/**
 * @description Builds the one-time plaintext token returned from {@link ServiceAccountsService.createCredential}.
 */
export function formatServiceAccountToken(
  prefix: string,
  secret: string,
): string {
  return `${SERVICE_ACCOUNT_BEARER_PREFIX}${prefix}_${secret}`;
}

/**
 * @description Constant-time equality for two strings of equal encoding (used before bcrypt when lengths differ).
 */
export function safeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
