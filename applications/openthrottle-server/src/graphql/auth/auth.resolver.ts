/**
 * @description GraphQL resolver for auth: login and register mutations (public, no JWT required). Uses LocalStrategy for credential validation.
 */

import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { Public } from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import type { User } from '@openthrottle/nestjs-repositories';
import { AuthService } from './auth.service';
import { GqlLocalAuthGuard } from './guards/gql-local-auth.guard';
import { GqlLocalCredentialsGuard } from './guards/gql-local-credentials.guard';
import { LoginInput } from './login.input';
import { LoginResultObject } from './login-result.object';
import { RegisterInput } from './register.input';
import { RegisterResultObject } from './register-result.object';
import { SignoutResultObject } from './signout-result.object';

@Public()
@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * @description Sign in with email and password. LocalStrategy validates against Cortex users; returns JWT with sub: user.id.
   */
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
