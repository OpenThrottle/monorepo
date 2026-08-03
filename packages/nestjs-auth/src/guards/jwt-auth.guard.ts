import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { firstValueFrom, isObservable, type Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JWT_STRATEGY_NAME } from '../strategies/jwt.strategy';

/**
 * @description Guard that enforces JWT authentication. Use with @UseGuards(JwtAuthGuard).
 * The validated user is attached to request.user (or custom property via PassportModule options).
 * NestJS RBAC guards can read the authenticated user from the request to enforce role/permission checks.
 *
 * Honors the {@link Public} decorator: routes (or controllers) marked with `@Public()`
 * short-circuit and skip JWT authentication entirely. Callers that need optional
 * enrichment on public routes should use {@link JwtAuthGuard.tryAuthenticate}.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard(JWT_STRATEGY_NAME) {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * @description Attempts Passport JWT auth without honoring `@Public()` short-circuit.
   * Returns `false` (never throws) when the token is missing or invalid — used for
   * soft-auth enrichment on public handlers.
   */
  async tryAuthenticate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = await super.canActivate(context);

      if (isObservable(result)) {
        return (await firstValueFrom(result)) === true;
      }

      return result === true;
    } catch {
      return false;
    }
  }

  override handleRequest<TUser>(
    err: Error | null,
    user: TUser | false,
    _info: unknown,
    _context: ExecutionContext,
    _status?: number,
  ): TUser {
    if (err) {
      throw err;
    }

    if (!user) {
      // 🔒 JWT authentication required
      throw new UnauthorizedException('Unauthorized');
    }

    return user;
  }
}
