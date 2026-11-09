/**
 * @description Masking for MCP connector api_token credentials. The raw token is
 * never persisted; only this masked hint (for display) plus a bcrypt hash are kept.
 */

/** Chars of the token head kept visible in the masked hint. */
const VISIBLE_HEAD = 4;
/** Chars of the token tail kept visible in the masked hint. */
const VISIBLE_TAIL = 4;

/**
 * @description Builds a display-only masked hint for an api_token, e.g.
 * `sk_l…3xYz`. Reveals at most {@link VISIBLE_HEAD} leading and
 * {@link VISIBLE_TAIL} trailing characters; short tokens are fully masked so no
 * meaningful portion of the secret leaks.
 */
export function maskCredentialToken(token: string): string {
  const trimmed = token.trim();
  if (trimmed.length <= VISIBLE_HEAD + VISIBLE_TAIL) {
    return '…';
  }
  const head = trimmed.slice(0, VISIBLE_HEAD);
  const tail = trimmed.slice(-VISIBLE_TAIL);
  return `${head}…${tail}`;
}
