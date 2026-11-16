import type {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
} from './auth-principal.constants.ts';
export type AuthPrincipalKind =
  typeof AUTH_PRINCIPAL_KIND_USER | typeof AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT;

/**
 * @description The OAuth grant a user principal was authenticated through (an `ot_oat_`
 * access token on the public MCP domain). Its scopes only ever subtract from the user's
 * own permissions.
 */
export interface OAuthPrincipalGrant {
  readonly clientId: string;
  readonly grantId: string;
  readonly scopes: readonly string[];
}

/**
 * @description Human identity after JWT validation (or explicit user principal).
 * `oauth` is set only when the request authenticated with an OAuth access token, so code
 * that must require an interactive session (e.g. OAuth consent) can refuse it.
 */
export interface UserAuthPrincipal {
  readonly email?: string;
  readonly exp?: number;
  readonly iat?: number;
  readonly kind: typeof AUTH_PRINCIPAL_KIND_USER;
  readonly oauth?: OAuthPrincipalGrant;
  readonly roles?: readonly string[];
  readonly sub: string;
}

/**
 * @description Machine identity after service-account token validation.
 * `sub` is the service account UUID.
 */
export interface ServiceAccountAuthPrincipal {
  readonly kind: typeof AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT;
  readonly sub: string;
}

/**
 * @description Request identity for RBAC and CLS: human JWT or service account token.
 */
export type AuthPrincipal = UserAuthPrincipal | ServiceAccountAuthPrincipal;
