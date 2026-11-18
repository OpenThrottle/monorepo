import bcrypt from 'bcrypt';

import { SERVICE_ACCOUNT_SECRET_BCRYPT_ROUNDS } from './secret.constants.ts';

/**
 * @description Hashes a credential secret with bcrypt.
 * @public
 */
export async function hashSecret(
  plainSecret: string,
  rounds: number = SERVICE_ACCOUNT_SECRET_BCRYPT_ROUNDS,
): Promise<string> {
  return bcrypt.hash(plainSecret, rounds);
}

/**
 * @description Compares a plaintext secret to a stored bcrypt hash. A missing or empty hash
 * never matches.
 * @public
 */
export async function validateSecret(
  plainSecret: string,
  secretHash: string | null | undefined,
): Promise<boolean> {
  if (secretHash == null || secretHash === '') {
    return false;
  }
  return bcrypt.compare(plainSecret, secretHash);
}
