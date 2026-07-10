import type { JwtPayload } from './strategies/jwt.strategy';

/** Discriminant for {@link UserAuthPrincipal}. */
export const AUTH_PRINCIPAL_KIND_USER = 'user' as const;

/** Discriminant for {@link ServiceAccountAuthPrincipal}. */
export const AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT = 'service_account' as const;

export type AuthPrincipalKind =
  | typeof AUTH_PRINCIPAL_KIND_USER
  | typeof AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT;

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

/**
 * @description Stable subject id for permission lookups (user id or service account id).
 */
export const getAuthPrincipalSub = (principal: AuthPrincipal): string =>
  principal.sub;

/**
 * @description Maps a validated JWT payload to a user {@link AuthPrincipal}.
 */
/**
 * @description Maps a verified service account id to a {@link ServiceAccountAuthPrincipal}.
 */
export const authPrincipalFromServiceAccountId = (
  serviceAccountId: string,
): ServiceAccountAuthPrincipal => ({
  kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  sub: serviceAccountId,
});

export const authPrincipalFromJwtPayload = (
  payload: JwtPayload,
): UserAuthPrincipal => ({
  kind: AUTH_PRINCIPAL_KIND_USER,
  ...(payload.email !== undefined ? { email: payload.email } : {}),
  ...(payload.exp !== undefined ? { exp: payload.exp } : {}),
  ...(payload.iat !== undefined ? { iat: payload.iat } : {}),
  ...(payload.roles !== undefined ? { roles: payload.roles } : {}),
  sub: payload.sub,
});

const parseOptionalStringArray = (
  value: unknown,
): readonly string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const out: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string') {
      return undefined;
    }

    out.push(item);
  }

  return out;
};

const userPrincipalFromUnknown = (
  userUnknown: Record<string, unknown>,
): UserAuthPrincipal | undefined => {
  const subUnknown = userUnknown.sub;

  if (typeof subUnknown !== 'string') {
    return undefined;
  }

  const emailUnknown = userUnknown.email;
  const expUnknown = userUnknown.exp;
  const iatUnknown = userUnknown.iat;
  const roles = parseOptionalStringArray(userUnknown.roles);

  return {
    kind: AUTH_PRINCIPAL_KIND_USER,
    sub: subUnknown,
    ...(typeof emailUnknown === 'string' ? { email: emailUnknown } : {}),
    ...(typeof expUnknown === 'number' ? { exp: expUnknown } : {}),
    ...(typeof iatUnknown === 'number' ? { iat: iatUnknown } : {}),
    ...(roles !== undefined ? { roles } : {}),
  };
};

/**
 * @description Narrows an unknown value to an indexable record without a cast.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * @description Type guard for {@link AuthPrincipal} on `request.user`.
 */
export const isAuthPrincipal = (value: unknown): value is AuthPrincipal => {
  if (!isRecord(value)) {
    return false;
  }

  const kind = value.kind;
  const sub = value.sub;

  if (typeof sub !== 'string') {
    return false;
  }

  if (
    kind !== undefined &&
    kind !== AUTH_PRINCIPAL_KIND_USER &&
    kind !== AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT
  ) {
    return false;
  }

  if (kind === AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT) {
    return true;
  }

  return userPrincipalFromUnknown(value) != null;
};

/**
 * @description Normalizes Passport `request.user` (JWT payload or explicit principal) to {@link AuthPrincipal}.
 */
export const normalizeRequestAuthPrincipal = (
  user: unknown,
): AuthPrincipal | undefined => {
  if (!isRecord(user)) {
    return undefined;
  }

  const kind = user.kind;

  if (
    kind !== undefined &&
    kind !== AUTH_PRINCIPAL_KIND_USER &&
    kind !== AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT
  ) {
    return undefined;
  }

  if (kind === AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT) {
    const sub = user.sub;

    if (typeof sub !== 'string') {
      return undefined;
    }

    return { kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT, sub };
  }

  if (kind === AUTH_PRINCIPAL_KIND_USER) {
    return userPrincipalFromUnknown(user);
  }

  return userPrincipalFromUnknown(user);
};
