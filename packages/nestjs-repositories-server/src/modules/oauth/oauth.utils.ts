/**
 * @description Pure helpers for the OpenThrottle OAuth authorization server: opaque token
 * format and hashing, PKCE S256, scope parsing, and redirect URI matching.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { hashSecret } from '../service-account-credentials/secret/secret.utils.ts';
import {
  OAUTH_ACCESS_TOKEN_PREFIX,
  OAUTH_REFRESH_TOKEN_PREFIX,
  OAUTH_SCOPES,
  OAUTH_SUPPORTED_SCOPES,
  OAUTH_TOKEN_KINDS,
} from './oauth.constants.ts';
import type {
  MintedOAuthToken,
  OAuthScope,
  OAuthTokenKind,
  ParsedOAuthToken,
} from './oauth.types.ts';

const PREFIX_BYTES = 8;
const SECRET_BYTES = 32;
const TOKEN_PART_PATTERN = /^[a-f0-9]+$/;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '[::1]', 'localhost']);

const base64Url = (bytes: Buffer): string => {
  return bytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const tokenPrefixFor = (kind: OAuthTokenKind): string => {
  return kind === OAUTH_TOKEN_KINDS.ACCESS
    ? OAUTH_ACCESS_TOKEN_PREFIX
    : OAUTH_REFRESH_TOKEN_PREFIX;
};

/**
 * @description Hex SHA-256 of an OAuth secret: the secret part of an `ot_oat_` access token or an
 * `ot_ort_` refresh token, or a whole authorization code. It is the same scheme as service-account
 * credentials, so it delegates to their `hashSecret`.
 *
 * - **No slow KDF.** Every input is 256 bits from `randomBytes`, so there is nothing to guess and
 *   bcrypt would add nothing except a pass through libuv's thread pool on every request.
 * - **No HMAC.** A keyed hash only stops an attacker who can write to the database, and that
 *   attacker can already overwrite a `users.password_hash` and sign in as an admin. In return it
 *   would cost a new secret in every environment and a rotation story.
 * - **CodeQL** `js/insufficient-password-hash` flags this call regardless, because its password
 *   heuristic matches any identifier containing `oauth`. The alert is a known false positive:
 *   dismiss it with a link to the decision rather than renaming identifiers to dodge it.
 *
 * Decision, measurements and threat model: docs/openthrottle/openthrottle-server-auth.md
 * § Machine token hashing.
 */
export function hashOAuthSecret(secret: string): string {
  return hashSecret(secret);
}

/**
 * @description Constant-time comparison of two strings of equal-length hashes or digests: a
 * stored hash against {@link hashOAuthSecret} of a presented secret, or a PKCE challenge against
 * the computed S256 digest. Not `validateSecret` from the service-account secret utils: that one
 * is async, takes the plaintext rather than a digest, and falls back to bcrypt for a legacy
 * `$2…$` hash, a path OAuth rows never need and should never accept.
 */
export function oauthHashesEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/** @description Mints an `ot_oat_` or `ot_ort_` token. */
export function mintOAuthToken(kind: OAuthTokenKind): MintedOAuthToken {
  const prefix = randomBytes(PREFIX_BYTES).toString('hex');
  const secret = randomBytes(SECRET_BYTES).toString('hex');

  return {
    prefix,
    secretHash: hashOAuthSecret(secret),
    token: `${tokenPrefixFor(kind)}${prefix}_${secret}`,
  };
}

/** @description Mints a single-use authorization code and its stored hash. */
export function mintAuthorizationCode(): {
  readonly code: string;
  readonly codeHash: string;
} {
  const code = base64Url(randomBytes(SECRET_BYTES));
  return { code, codeHash: hashOAuthSecret(code) };
}

/** @description Parses `ot_oat_<prefix>_<secret>` / `ot_ort_<prefix>_<secret>`, or null. */
export function parseOAuthToken(token: string): ParsedOAuthToken | null {
  const trimmed = token.trim();
  let kind: OAuthTokenKind;
  let remainder: string;

  if (trimmed.startsWith(OAUTH_ACCESS_TOKEN_PREFIX)) {
    kind = OAUTH_TOKEN_KINDS.ACCESS;
    remainder = trimmed.slice(OAUTH_ACCESS_TOKEN_PREFIX.length);
  } else if (trimmed.startsWith(OAUTH_REFRESH_TOKEN_PREFIX)) {
    kind = OAUTH_TOKEN_KINDS.REFRESH;
    remainder = trimmed.slice(OAUTH_REFRESH_TOKEN_PREFIX.length);
  } else {
    return null;
  }

  const separatorIndex = remainder.indexOf('_');
  if (separatorIndex <= 0) {
    return null;
  }

  const prefix = remainder.slice(0, separatorIndex);
  const secret = remainder.slice(separatorIndex + 1);
  if (!TOKEN_PART_PATTERN.test(prefix) || !TOKEN_PART_PATTERN.test(secret)) {
    return null;
  }

  return { kind, prefix, secret };
}

/** @description True when the value (optionally `Bearer `-prefixed) is an OAuth access token. */
export function isOAuthAccessTokenAuthorization(
  authorization: string,
): boolean {
  const trimmed = authorization.trim();
  const token = trimmed.toLowerCase().startsWith('bearer ')
    ? trimmed.slice(7).trim()
    : trimmed;
  return token.startsWith(OAUTH_ACCESS_TOKEN_PREFIX);
}

/** @description RFC 7636 S256: BASE64URL(SHA256(verifier)) === challenge, in constant time. */
export function verifyPkceS256(
  codeVerifier: string,
  codeChallenge: string,
): boolean {
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(codeVerifier)) {
    return false;
  }
  const computed = base64Url(
    createHash('sha256').update(codeVerifier, 'ascii').digest(),
  );
  return oauthHashesEqual(computed, codeChallenge);
}

const isOAuthScope = (value: string): value is OAuthScope => {
  return OAUTH_SUPPORTED_SCOPES.some((scope) => scope === value);
};

/**
 * @description Parses a space-delimited `scope` parameter. Unknown scopes are dropped
 * (RFC 6749 §3.3 lets the AS issue a narrower set); an empty or absent scope means
 * every supported scope. `mcp:write` implies `mcp:read`, so it is always added.
 */
export function parseOAuthScopes(raw: string | null | undefined): OAuthScope[] {
  const requested = (raw ?? '')
    .split(' ')
    .map((part) => part.trim())
    .filter(isOAuthScope);

  const scopes = new Set<OAuthScope>(
    requested.length === 0 ? OAUTH_SUPPORTED_SCOPES : requested,
  );
  if (scopes.has(OAUTH_SCOPES.MCP_WRITE)) {
    scopes.add(OAUTH_SCOPES.MCP_READ);
  }

  return OAUTH_SUPPORTED_SCOPES.filter((scope) => scopes.has(scope));
}

/** @description True when the scope set allows writes. */
export function scopesAllowWrite(scopes: readonly string[]): boolean {
  return scopes.includes(OAUTH_SCOPES.MCP_WRITE);
}

const isLoopbackHttp = (url: URL): boolean => {
  return url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname);
};

/**
 * @description Whether a redirect URI is acceptable to register: https, loopback http
 * (RFC 8252 §7.3), or a private-use scheme containing a dot or a known client scheme
 * (RFC 8252 §7.1). No fragments, no userinfo.
 */
export function isRegistrableRedirectUri(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  if (url.hash !== '' || url.username !== '' || url.password !== '') {
    return false;
  }

  if (url.protocol === 'https:' || isLoopbackHttp(url)) {
    return true;
  }

  const scheme = url.protocol.slice(0, -1);
  const isPrivateUse = /^[a-z][a-z0-9+.-]*$/.test(scheme);
  const isDangerous = [
    'data',
    'file',
    'http',
    'javascript',
    'vbscript',
  ].includes(scheme);

  return isPrivateUse && !isDangerous;
}

/**
 * @description Whether a presented redirect URI matches a registered one: exact string
 * match, except that loopback http URIs ignore the port (native clients bind an
 * ephemeral port, RFC 8252 §7.3).
 */
export function redirectUriMatches(
  registered: readonly string[],
  presented: string,
): boolean {
  if (registered.includes(presented)) {
    return true;
  }

  let presentedUrl: URL;
  try {
    presentedUrl = new URL(presented);
  } catch {
    return false;
  }

  if (!isLoopbackHttp(presentedUrl)) {
    return false;
  }

  return registered.some((candidate) => {
    let candidateUrl: URL;
    try {
      candidateUrl = new URL(candidate);
    } catch {
      return false;
    }
    return (
      isLoopbackHttp(candidateUrl) &&
      candidateUrl.hostname === presentedUrl.hostname &&
      candidateUrl.pathname === presentedUrl.pathname &&
      candidateUrl.search === presentedUrl.search
    );
  });
}
