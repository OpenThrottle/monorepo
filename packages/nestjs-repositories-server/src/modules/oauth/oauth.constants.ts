/**
 * @description Constants for the OpenThrottle OAuth authorization server. Design: docs/openthrottle/mcp-oauth-design.md.
 */

/** @description Bearer prefix of an OAuth access token: `ot_oat_<prefix>_<secret>`. */
export const OAUTH_ACCESS_TOKEN_PREFIX = 'ot_oat_' as const;

/** @description Prefix of an OAuth refresh token: `ot_ort_<prefix>_<secret>`. */
export const OAUTH_REFRESH_TOKEN_PREFIX = 'ot_ort_' as const;

/** @description Scopes the authorization server issues. `mcp:write` implies `mcp:read`. */
export const OAUTH_SCOPES = {
  MCP_READ: 'mcp:read',
  MCP_WRITE: 'mcp:write',
} as const;

export type OauthScopesKey = keyof typeof OAUTH_SCOPES;
export type OauthScopesValue = (typeof OAUTH_SCOPES)[OauthScopesKey];

/** @description Every scope, in the order metadata advertises them. */
export const OAUTH_SUPPORTED_SCOPES: readonly (typeof OAUTH_SCOPES)[keyof typeof OAUTH_SCOPES][] =
  [OAUTH_SCOPES.MCP_READ, OAUTH_SCOPES.MCP_WRITE];

/** @description Lifetimes, in milliseconds. */
export const OAUTH_LIFETIMES_MS = {
  ACCESS_TOKEN: 60 * 60 * 1000,
  AUTHORIZATION_CODE: 60 * 1000,
  CONSENT: 10 * 60 * 1000,
  GRANT: 30 * 24 * 60 * 60 * 1000,
  LAST_USED_WRITE_INTERVAL: 60 * 1000,
} as const;

export const OAUTH_REGISTRATION_KINDS = {
  CIMD: 'cimd',
  DCR: 'dcr',
} as const;

export type OauthRegistrationKindsKey = keyof typeof OAUTH_REGISTRATION_KINDS;
export type OauthRegistrationKindsValue =
  (typeof OAUTH_REGISTRATION_KINDS)[OauthRegistrationKindsKey];

export const OAUTH_AUTHORIZATION_REQUEST_STATUSES = {
  APPROVED: 'approved',
  DENIED: 'denied',
  EXCHANGED: 'exchanged',
  PENDING: 'pending',
} as const;

export type OauthAuthorizationRequestStatusesKey =
  keyof typeof OAUTH_AUTHORIZATION_REQUEST_STATUSES;
export type OauthAuthorizationRequestStatusesValue =
  (typeof OAUTH_AUTHORIZATION_REQUEST_STATUSES)[OauthAuthorizationRequestStatusesKey];

export const OAUTH_GRANT_REVOKED_REASONS = {
  ADMIN: 'admin',
  CODE_REUSE: 'code_reuse',
  REFRESH_REUSE: 'refresh_reuse',
  USER: 'user',
  USER_DISABLED: 'user_disabled',
} as const;

export type OauthGrantRevokedReasonsKey =
  keyof typeof OAUTH_GRANT_REVOKED_REASONS;
export type OauthGrantRevokedReasonsValue =
  (typeof OAUTH_GRANT_REVOKED_REASONS)[OauthGrantRevokedReasonsKey];

export const OAUTH_TOKEN_KINDS = {
  ACCESS: 'access',
  REFRESH: 'refresh',
} as const;

export type OauthTokenKindsKey = keyof typeof OAUTH_TOKEN_KINDS;
export type OauthTokenKindsValue =
  (typeof OAUTH_TOKEN_KINDS)[OauthTokenKindsKey];
