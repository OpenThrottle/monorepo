/**
 * @description Passport local strategy: validates email (as username) and password against OpenThrottle users.
 * Use with AuthGuard('local'); credentials must be provided to the request (e.g. by login resolver).
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import type { User } from '@openthrottle/nestjs-repositories';
import { UsersService } from '@openthrottle/nestjs-repositories';
import { LoggerService } from '@openthrottle/nestjs-modules';

/** Strategy name for use with AuthGuard('local'). */
export const LOCAL_STRATEGY_NAME = 'local';

@Injectable()
export class LocalStrategy extends PassportStrategy(
  Strategy,
  LOCAL_STRATEGY_NAME,
) {
  constructor(
    private readonly usersService: UsersService,
    private readonly logger: LoggerService,
  ) {
    super({
      passwordField: 'password',
      usernameField: 'username',
    });

    console.log('🔑 local-strategy', { usersService: usersService });
  }

  /**
   * @description Validates credentials. Username is treated as email. Returns user or throws.
   */
  async validate(username: string, password: string): Promise<User> {
    const email = username;
    const user = await this.usersService.findByEmail(email);

    this.logger.info('🔑 local-strategy', { user });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await this.usersService.validatePassword(
      password,
      user.passwordHash,
    );

    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.disabledAt != null) {
      throw new UnauthorizedException('Account is disabled');
    }

    return user;
  }
}
