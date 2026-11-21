/**
 * @description Hashing and verification for service-account credential secrets. New rows store
 * the hex SHA-256 of the secret; rows minted before that change hold a bcrypt hash, which
 * {@link validateSecret} still accepts so they can be rehashed on their next successful use.
 * Why SHA-256 and not bcrypt or HMAC: docs/openthrottle/openthrottle-server-auth.md
 * § Machine token hashing.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

import bcrypt from 'bcrypt';

const LEGACY_BCRYPT_HASH_PATTERN = /^\$2[abxy]\$/;

/**
 * @description Hex SHA-256 of a credential secret. The secret is high-entropy random (see
 * `SERVICE_ACCOUNT_SECRET_MIN_LENGTH`), so a slow KDF buys nothing and would cost one bcrypt
 * per authenticated request.
 * @public
 */
export function hashSecret(plainSecret: string): string {
  return createHash('sha256').update(plainSecret, 'utf8').digest('hex');
}

/**
 * @description Whether a stored hash predates the SHA-256 scheme (a bcrypt `$2…$` hash).
 * @public
 */
export function isLegacySecretHash(secretHash: string): boolean {
  return LEGACY_BCRYPT_HASH_PATTERN.test(secretHash);
}

/**
 * @description Compares a plaintext secret to a stored hash, in constant time for SHA-256 and
 * through bcrypt for a legacy hash. A missing or empty hash never matches.
 * @public
 */
export async function validateSecret(
  plainSecret: string,
  secretHash: string | null | undefined,
): Promise<boolean> {
  if (secretHash == null || secretHash === '') {
    return false;
  }
  if (isLegacySecretHash(secretHash)) {
    return bcrypt.compare(plainSecret, secretHash);
  }
  const expected = Buffer.from(secretHash, 'utf8');
  const actual = Buffer.from(hashSecret(plainSecret), 'utf8');
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
}
