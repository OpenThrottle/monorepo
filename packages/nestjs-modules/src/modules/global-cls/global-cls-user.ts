/**
 * @description Authenticated user snapshot stored in CLS for the current request.
 * Optional on {@link GlobalClsStore}: omit until auth runs (public routes) or populate after JWT/session validation.
 */
export interface GlobalClsUser {
  readonly displayName: string;
  readonly email: string;
  readonly isDeleted: boolean;
  readonly permissions?: readonly string[];
  readonly roles: readonly string[];
  readonly uuid: string;
}

/**
 * @description Minimal JWT/session identity shape (e.g. Passport `request.user` after JwtStrategy).
 * Apps may map DB fields into {@link GlobalClsUser} instead of using this helper alone.
 */
export interface GlobalClsJwtLikeInput {
  readonly email?: string;
  readonly roles?: readonly string[];
  readonly sub: string;
}

/**
 * @description Maps JWT-like payload to {@link GlobalClsUser} with safe defaults when fields are absent.
 * Use for minimal coupling; replace or enrich in the app after loading the full user record if needed.
 */
export const globalClsUserFromJwtLike = (
  input: GlobalClsJwtLikeInput,
): GlobalClsUser => {
  const email = input.email ?? '';
  const uuid = input.sub;

  return {
    displayName: email.length > 0 ? email : uuid,
    email,
    isDeleted: false,
    permissions: undefined,
    roles: input.roles != null ? [...input.roles] : [],
    uuid,
  };
};
