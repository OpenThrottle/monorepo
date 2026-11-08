import type {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
} from './auth-principal.constants.ts';
export type AuthPrincipalKind =
  typeof AUTH_PRINCIPAL_KIND_USER | typeof AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT;

/**
 * @description Human identity after JWT validation (or explicit user principal).
 */
export interface UserAuthPrincipal {
  readonly email?: string;
  readonly exp?: number;
  readonly iat?: number;
  readonly kind: typeof AUTH_PRINCIPAL_KIND_USER;
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
