import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { NestjsAuthOptions } from '../config/nestjs-auth.options';

/** Strategy name for use with AuthGuard('jwt'). */
export const JWT_STRATEGY_NAME = 'jwt';

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

    super({
      algorithms: ['HS256'],
      ignoreExpiration: false,
      issuer: options?.jwtIssuer ?? configService.get<string>('JWT_ISSUER'),
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
