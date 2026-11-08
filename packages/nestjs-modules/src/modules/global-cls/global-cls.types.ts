import type { ClsStore } from 'nestjs-cls';

/**
 * @external https://papooch.github.io/nestjs-cls/features-and-use-cases/type-safety-and-type-inference#type-safe-clsservice
 * @description We want to define a type-safe store for our application which
 * helps with getting and setting data. We should keep this context as simple
 * as possible and avoid putting too much data in it.
 */
export interface GlobalClsStore extends ClsStore {
  app: {
    name: string;
    version: string;
  };

  /**
   * @description Raw `x-ot-session-id` request header, if present. An UNVALIDATED
   * client claim — consumers must verify the session's actor matches the request
   * principal before attributing work to it (work-ledger ambient attribution; G11 in
   * docs/monorepo/work-ledger-sessions.md).
   */
  sessionId?: string;

  /**
   * @description Present after auth populates it (see {@link applyGlobalClsUser});
   * omitted on public or pre-auth requests.
   */
  user?: GlobalClsUser;
}
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
