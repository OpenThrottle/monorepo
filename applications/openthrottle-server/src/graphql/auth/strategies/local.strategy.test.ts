/**
 * @description Unit tests for LocalStrategy: per-account backoff wiring and the
 * production refusal of the public default bootstrap password.
 */

import { createMock } from '@golevelup/ts-vitest';
import {
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { UsersService } from '@openthrottle/nestjs-repositories';
import { usersFactory } from '@openthrottle/nestjs-repositories/testing';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { DEFAULT_BOOTSTRAP_USER_PASSWORD } from '../../../config/bootstrap-password.ts';
import {
  LOGIN_BACKOFF,
  LoginAttemptsService,
} from '../login-attempts.service.ts';
import { LocalStrategy } from './local.strategy.ts';

const EMAIL = 'owner@example.com';

describe('LocalStrategy', () => {
  const user = usersFactory.build({ disabledAt: null, email: EMAIL });
  const usersService = createMock<UsersService>({
    findByEmail: vi.fn(),
    validatePassword: vi.fn(),
  });
  let loginAttempts: LoginAttemptsService;
  let strategy: LocalStrategy;

  beforeEach(() => {
    vi.mocked(usersService.findByEmail).mockReset().mockResolvedValue(user);
    vi.mocked(usersService.validatePassword)
      .mockReset()
      .mockResolvedValue(true);
    loginAttempts = new LoginAttemptsService();
    strategy = new LocalStrategy(
      usersService,
      loginAttempts,
      createMock<LoggerService>(),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const failTimes = async (count: number): Promise<void> => {
    vi.mocked(usersService.validatePassword).mockResolvedValue(false);
    for (let i = 0; i < count; i += 1) {
      // eslint-disable-next-line no-await-in-loop -- attempts are sequential by nature
      await strategy.validate(EMAIL, 'wrong').catch(() => undefined);
    }
  };

  test('returns the user for valid credentials', async () => {
    await expect(strategy.validate(EMAIL, 'right')).resolves.toBe(user);
  });

  test('refuses a locked account with 429 before looking the user up', async () => {
    await failTimes(LOGIN_BACKOFF.freeFailures + 1);
    vi.mocked(usersService.findByEmail).mockClear();

    const error = await strategy
      .validate(EMAIL, 'right')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect(error instanceof HttpException && error.getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
    expect(usersService.findByEmail).not.toHaveBeenCalled();
  });

  test('counts an unknown email as a failure', async () => {
    vi.mocked(usersService.findByEmail).mockResolvedValue(null);

    for (let i = 0; i <= LOGIN_BACKOFF.freeFailures; i += 1) {
      // eslint-disable-next-line no-await-in-loop -- attempts are sequential by nature
      await expect(strategy.validate(EMAIL, 'x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    }

    await expect(strategy.validate(EMAIL, 'x')).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  test('a successful sign-in clears earlier failures', async () => {
    await failTimes(LOGIN_BACKOFF.freeFailures);
    vi.mocked(usersService.validatePassword).mockResolvedValue(true);

    await strategy.validate(EMAIL, 'right');
    await failTimes(1);

    vi.mocked(usersService.validatePassword).mockResolvedValue(true);
    await expect(strategy.validate(EMAIL, 'right')).resolves.toBe(user);
  });

  test('refuses the default bootstrap password in production, whatever the hash says', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    await expect(
      strategy.validate(EMAIL, DEFAULT_BOOTSTRAP_USER_PASSWORD),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(usersService.validatePassword).not.toHaveBeenCalled();
  });

  test('accepts the default bootstrap password locally', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    await expect(
      strategy.validate(EMAIL, DEFAULT_BOOTSTRAP_USER_PASSWORD),
    ).resolves.toBe(user);
  });
});
