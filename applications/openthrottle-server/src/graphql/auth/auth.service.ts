/**
 * @description Signs JWTs for login and handles registration. Uses same secret/issuer as JwtStrategy so tokens are valid for API auth.
 * Credential validation is done by LocalStrategy; this service only signs for an already-validated user.
 */

import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { UsersService } from '@openthrottle/nestjs-repositories';
import type { User } from '@openthrottle/nestjs-repositories';
import type { RegisterInput } from './register.input';
import type { RegisterResultObject } from './register-result.object';

const DEFAULT_EXPIRES_IN = '24h';
/** Short-lived: the subscription token only guards the graphql-ws handshake. */
const SUBSCRIPTION_TOKEN_EXPIRES_IN = '5m';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * @description Issue a JWT for a validated user. Call after AuthGuard('local') has set request.user.
   */
  async login(user: User): Promise<{ accessToken: string }> {
    const issuer = this.configService.get<string>('JWT_ISSUER');
    const payload = { email: user.email ?? undefined, sub: user.id };
    const options: JwtSignOptions = issuer
      ? { expiresIn: DEFAULT_EXPIRES_IN, issuer }
      : { expiresIn: DEFAULT_EXPIRES_IN };

    const accessToken = this.jwtService.sign(payload, options);
    return { accessToken };
  }

  /**
   * @description Acknowledge signout. Client is responsible for clearing the auth cookie; this mutation allows the client to call the API for consistency and future server-side cleanup (e.g. token invalidation).
   */
  async signout(): Promise<{ success: boolean }> {
    return { success: true };
  }

  /**
   * @description Issue a short-lived JWT (sub = userId) for authenticating a
   * graphql-ws subscription connection. Same secret/issuer as the API token, so
   * the server's onConnect verifies it identically; the browser fetches a fresh
   * one per (re)connect, so a short TTL is safe.
   */
  signSubscriptionToken(userId: string): string {
    const issuer = this.configService.get<string>('JWT_ISSUER');
    const options: JwtSignOptions = issuer
      ? { expiresIn: SUBSCRIPTION_TOKEN_EXPIRES_IN, issuer }
      : { expiresIn: SUBSCRIPTION_TOKEN_EXPIRES_IN };

    return this.jwtService.sign({ sub: userId }, options);
  }

  /**
   * @description Create a new user and return id, email, and a JWT so the client can stay logged in.
   * @throws ConflictException if email is already registered
   */
  async register(input: RegisterInput): Promise<RegisterResultObject> {
    const existing = await this.usersService.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const base =
      input.githubUsername?.trim() ||
      input.email.replace(/@.*/, '').trim() ||
      'user';

    const githubUsername = `${base}-${randomUUID().slice(0, 8)}`;
    const passwordHash = await this.usersService.hashPassword(input.password);
    const user = await this.usersService.create({
      email: input.email,
      githubUsername,
      passwordHash,
    });

    const { accessToken } = await this.login(user);

    return {
      accessToken,
      email: user.email ?? input.email,
      id: user.id,
    };
  }
}
