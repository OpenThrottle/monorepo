import bcrypt from 'bcrypt';

import { PASSWORD_BCRYPT_ROUNDS } from './password.constants.ts';

/**
 * @description Hashes a plain-text password with bcrypt. Use when creating or updating a user
 * (e.g. registration).
 * @public
 */
export async function hashPassword(
  plainPassword: string,
  rounds: number = PASSWORD_BCRYPT_ROUNDS,
): Promise<string> {
  return bcrypt.hash(plainPassword, rounds);
}

/**
 * @description Compares a plain-text password with a bcrypt hash. Returns true if they match.
 * Use when validating login credentials (e.g. in Passport local strategy). A missing or empty
 * hash never matches.
 * @public
 */
export async function validatePassword(
  plainPassword: string,
  hashedPassword: string | null | undefined,
): Promise<boolean> {
  if (hashedPassword == null || hashedPassword === '') {
    return false;
  }
  return bcrypt.compare(plainPassword, hashedPassword);
}
