/**
 * @description Token storage and key for OpenThrottle auth. Uses vscode.SecretStorage
 * scoped by API base URL so different servers (e.g. local vs staging) keep separate tokens.
 * @see docs/AUTH_DESIGN.md
 */

import * as crypto from 'node:crypto';
import * as vscode from 'vscode';

const SECRET_KEY_PREFIX = 'openthrottle.token';

/**
 * @description SecretStorage key for the token, scoped by hash of baseUrl so changing
 * openthrottle.apiBaseUrl does not reuse a token from another environment.
 */
export function getSecretKey(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/$/, '');
  const hash = crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex')
    .slice(0, 12);

  return `${SECRET_KEY_PREFIX}.${hash}`;
}

/**
 * @description Read the stored JWT for the given base URL, if any.
 */
export function getStoredToken(
  secrets: vscode.SecretStorage,
  baseUrl: string,
): Thenable<string | undefined> {
  return secrets.get(getSecretKey(baseUrl));
}

/**
 * @description Store the JWT for the given base URL after successful login.
 */
export function storeToken(
  secrets: vscode.SecretStorage,
  baseUrl: string,
  token: string,
): Thenable<void> {
  return secrets.store(getSecretKey(baseUrl), token);
}

/**
 * @description Delete the stored token (e.g. on sign out).
 */
export function deleteStoredToken(
  secrets: vscode.SecretStorage,
  baseUrl: string,
): Thenable<void> {
  return secrets.delete(getSecretKey(baseUrl));
}
