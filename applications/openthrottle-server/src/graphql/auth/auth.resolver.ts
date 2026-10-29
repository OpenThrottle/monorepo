/**
 * @description GraphQL resolver for auth: login and register mutations (public, no JWT required). Uses LocalStrategy for credential validation.
 */

import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { User } from '@openthrottle/nestjs-repositories';

import { AuthService } from './auth.service.ts';
import { GqlLocalAuthGuard } from './guards/gql-local-auth.guard.ts';
import { GqlLocalCredentialsGuard } from './guards/gql-local-credentials.guard.ts';
import { LoginInput } from './login.input.ts';
import { LoginResultObject } from './login-result.object.ts';
import { RegisterInput } from './register.input.ts';
import { RegisterResultObject } from './register-result.object.ts';
import { SignoutResultObject } from './signout-result.object.ts';

/**
 * Per-client-IP limit on credential mutations (the global tier allows 1,000 a
 * minute). Spending it blocks that IP for five minutes. It keys on `req.ip`,
 * which is the real client behind Caddy / the developer app's SSR hop because
 * main.ts sets `trust proxy`. The per-account backoff is LoginAttemptsService.
 */
export const CREDENTIALS_THROTTLE = {
  default: { blockDuration: 5 * 60_000, limit: 10, ttl: 60_000 },
} as const;

@Public()
@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * @description Sign in with email and password. LocalStrategy validates against OpenThrottle users; returns JWT with sub: user.id.
   */
  @Throttle(CREDENTIALS_THROTTLE)
  @UseGuards(GqlLocalCredentialsGuard, GqlLocalAuthGuard)
  @Mutation(() => LoginResultObject, {
    description: `Sign in with email and password. Returns JWT access token for Authorization header or cookie.`,
  })
  async login(
    @Args('input', { type: () => LoginInput }) _input: LoginInput,
    @Context() context: { req: { user: User } },
  ): Promise<LoginResultObject> {
    const user = context.req.user;
    const response = await this.authService.login(user);

    return response;
  }

  /**
   * @description Acknowledge signout. Client clears the auth cookie; this mutation allows the client to call the API for consistency.
   */
  @Mutation(() => SignoutResultObject, {
    description: `Sign out. Returns success; client is responsible for clearing the auth cookie.`,
  })
  async signout(): Promise<SignoutResultObject> {
    return this.authService.signout();
  }

  /**
   * @description Create a new user with email and password. Returns user id, email, and access token for immediate use.
   */
  @Throttle(CREDENTIALS_THROTTLE)
  @Mutation(() => RegisterResultObject, {
    description: `Register a new user. Returns id, email, and JWT access token.`,
  })
  async register(
    @Args('input', { type: () => RegisterInput }) input: RegisterInput,
  ): Promise<RegisterResultObject> {
    const result = await this.authService.register(input);

    this.logger.info('📝 register', { email: result.email, id: result.id });

    return result;
  }
}
