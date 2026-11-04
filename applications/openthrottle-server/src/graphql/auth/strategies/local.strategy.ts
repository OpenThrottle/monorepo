/**
 * @description Passport local strategy: validates email (as username) and password against OpenThrottle users.
 * Use with AuthGuard('local'); credentials must be provided to the request (e.g. by login resolver).
 *
 * Every attempt goes through {@link LoginAttemptsService}: a locked account is
 * refused before any hashing, and each failure (unknown email included)
 * extends the per-account backoff. In production the public default bootstrap
 * password is refused outright.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { User } from '@openthrottle/nestjs-repositories';
import { UsersService } from '@openthrottle/nestjs-repositories';
import { Strategy } from 'passport-local';

import { isRefusedDefaultPassword } from '../../../config/bootstrap-password.ts';
import { LoginAttemptsService } from '../login-attempts.service.ts';

/** Strategy name for use with AuthGuard('local'). */
export const LOCAL_STRATEGY_NAME = 'local';

@Injectable()
export class LocalStrategy extends PassportStrategy(
  Strategy,
  LOCAL_STRATEGY_NAME,
) {
  constructor(
    private readonly usersService: UsersService,
    private readonly loginAttempts: LoginAttemptsService,
    private readonly logger: LoggerService,
  ) {
    super({
      passwordField: 'password',
      usernameField: 'username',
    });
  }

  /**
   * @description Validates credentials. Username is treated as email. Returns user or throws.
   */
  async validate(username: string, password: string): Promise<User> {
    const email = username;

    this.loginAttempts.assertNotLocked(email);

    const isProduction = process.env.NODE_ENV === 'production';

    if (isRefusedDefaultPassword(password, isProduction)) {
      this.loginAttempts.recordFailure(email);
      this.logger.warn(
        'Refused a sign-in with the default bootstrap password',
        LocalStrategy.name,
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = await this.usersService.findByEmail(email);
    const valid =
      user != null &&
      (await this.usersService.validatePassword(password, user.passwordHash));

    if (user == null || !valid) {
      this.loginAttempts.recordFailure(email);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.disabledAt != null) {
      throw new UnauthorizedException('Account is disabled');
    }

    this.loginAttempts.recordSuccess(email);

    return user;
  }
}
