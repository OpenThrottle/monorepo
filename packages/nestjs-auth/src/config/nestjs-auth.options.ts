/**
 * @description Options for {@link NestjsAuthModule}. Used with forRoot/forRootAsync.
 */
export interface NestjsAuthOptions {
  /**
   * Optional audience to bind JWT verification to. When set, tokens are only
   * accepted if their `aud` claim matches, preventing a token minted for one
   * service from being accepted by another service sharing the same secret.
   * Opt-in: when omitted, the `aud` claim is not checked (preserves existing
   * tokens). Can also be supplied via env JWT_AUDIENCE when using ConfigService.
   */
  readonly jwtAudience?: string;

  /**
   * Optional issuer for JWT verification. Defaults to the app name when omitted.
   */
  readonly jwtIssuer?: string;

  /**
   * JWT secret used to verify tokens. Required for JWT strategy.
   * Can be overridden via env JWT_SECRET when using ConfigService.
   */
  readonly jwtSecret: string;
}
