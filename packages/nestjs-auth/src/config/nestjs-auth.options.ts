/**
 * @description Options for {@link NestjsAuthModule}. Used with forRoot/forRootAsync.
 */
export interface NestjsAuthOptions {
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
