import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { NestjsAuthOptions } from '../config/nestjs-auth.options';

/** Strategy name for use with AuthGuard('jwt'). */
export const JWT_STRATEGY_NAME = 'jwt';

/**
 * Minimum required byte-length for the JWT secret. HS256 keys shorter than the
 * hash output (32 bytes) are brute-forceable offline, so reject them at startup.
 */
export const JWT_SECRET_MIN_BYTES = 32;

/**
 * @description Payload shape returned by JWT verification. Consumers can extend this via module augmentation.
 */
export interface JwtPayload {
  readonly email?: string;
  readonly exp?: number;
  readonly iat?: number;
  /** Role identifiers for RBAC; include in token payload or set in validate(). */
  readonly roles?: readonly string[];
  readonly sub: string;
}

/**
 * @description JWT strategy for Passport. Validates tokens from Authorization header.
 * Requires JWT_SECRET (env) or options.jwtSecret when using NestjsAuthModule.forRoot().
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY_NAME) {
  constructor(
    configService: ConfigService,
    options?: NestjsAuthOptions | null,
  ) {
    const secret =
      options?.jwtSecret ?? configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error(
        'JwtStrategy: JWT_SECRET or NestjsAuthOptions.jwtSecret is required',
      );
    }

    if (Buffer.byteLength(secret, 'utf8') < JWT_SECRET_MIN_BYTES) {
      throw new Error(
        `JwtStrategy: JWT secret must be at least ${JWT_SECRET_MIN_BYTES} bytes ` +
          'for HS256; a short/low-entropy secret makes tokens brute-forceable offline',
      );
    }

    const audience =
      options?.jwtAudience ?? configService.get<string>('JWT_AUDIENCE');

    super({
      algorithms: ['HS256'],
      // Opt-in audience binding: when set, tokens are rejected unless their
      // `aud` claim matches, so a token minted for one service is not accepted
      // by another sharing the secret. Omitting it skips the check (back-compat).
      ...(audience ? { audience } : {}),
      ignoreExpiration: false,

      issuer: options?.jwtIssuer ?? configService.get<string>('JWT_ISSUER'),
      // Reject expired tokens with zero grace period beyond `exp`. jsonwebtoken
      // defaults clockTolerance to 0; we set it explicitly to document that no
      // clock skew is tolerated.
      jsonWebTokenOptions: { clockTolerance: 0 },
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  /**
   * @description Default `validate` trusts the token **signature only** — it returns
   * the decoded payload unchanged and performs NO existence / active / revocation
   * check on `sub`.
   *
   * SECURITY: Because nothing here re-checks the subject, any structurally-valid,
   * unexpired token authenticates — including tokens for a since-deleted, disabled,
   * or revoked user — until the token expires (up to its TTL, e.g. 24h). The
   * signature guarantees the token was minted by a holder of the secret, not that
   * the subject is still a valid principal.
   *
   * Production consumers MUST subclass `JwtStrategy` and override `validate` to
   * verify the subject still exists and is active (e.g. look up `payload.sub`,
   * reject if missing/disabled, and optionally enrich roles). This default exists
   * only for the stateless / signature-trust case; it is not enforced by the type
   * system, so the responsibility is on the consumer.
   *
   * @example
   * ```ts
   * @Injectable()
   * class AppJwtStrategy extends JwtStrategy {
   *   constructor(config: ConfigService, private readonly users: UsersService) {
   *     super(config);
   *   }
   *   override async validate(payload: JwtPayload): Promise<JwtPayload> {
   *     const user = await this.users.findActiveById(payload.sub);
   *     if (!user) throw new UnauthorizedException();
   *     return { ...payload, roles: user.roles };
   *   }
   * }
   * ```
   */
  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
