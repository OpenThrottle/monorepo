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
   * @description Validates the JWT payload. Override in subclasses to add custom validation.
   */
  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
