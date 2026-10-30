import { HttpException, HttpStatus } from '@nestjs/common';
import { describe, expect, test } from 'vitest';

import {
  lockDurationMs,
  LOGIN_BACKOFF,
  LoginAttemptsService,
} from './login-attempts.service.ts';

const EMAIL = 'owner@example.com';
const T0 = 1_000_000;

const failTimes = (
  service: LoginAttemptsService,
  count: number,
  now: number,
): void => {
  for (let i = 0; i < count; i += 1) {
    service.recordFailure(EMAIL, now);
  }
};

const captureLock = (
  service: LoginAttemptsService,
  now: number,
): { message: string; status: number } | null => {
  try {
    service.assertNotLocked(EMAIL, now);
    return null;
  } catch (error) {
    if (error instanceof HttpException) {
      return { message: error.message, status: error.getStatus() };
    }
    throw error;
  }
};

describe('lockDurationMs', () => {
  test('is free for the first failures, then doubles up to the ceiling', () => {
    expect(lockDurationMs(LOGIN_BACKOFF.freeFailures)).toBe(0);
    expect(lockDurationMs(LOGIN_BACKOFF.freeFailures + 1)).toBe(
      LOGIN_BACKOFF.baseLockMs,
    );
    expect(lockDurationMs(LOGIN_BACKOFF.freeFailures + 2)).toBe(
      LOGIN_BACKOFF.baseLockMs * 2,
    );
    expect(lockDurationMs(LOGIN_BACKOFF.freeFailures + 50)).toBe(
      LOGIN_BACKOFF.maxLockMs,
    );
  });
});

describe('LoginAttemptsService', () => {
  test('allows the free failures without locking', () => {
    const service = new LoginAttemptsService();

    failTimes(service, LOGIN_BACKOFF.freeFailures, T0);

    expect(captureLock(service, T0)).toBeNull();
  });

  test('locks with a 429 and a retry hint once the free failures are spent', () => {
    const service = new LoginAttemptsService();

    failTimes(service, LOGIN_BACKOFF.freeFailures + 1, T0);

    expect(captureLock(service, T0)).toEqual({
      message: 'Too many failed sign-in attempts. Try again in 30 seconds.',
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  test('unlocks once the lock expires', () => {
    const service = new LoginAttemptsService();

    failTimes(service, LOGIN_BACKOFF.freeFailures + 1, T0);

    expect(captureLock(service, T0 + LOGIN_BACKOFF.baseLockMs)).toBeNull();
  });

  test('treats the email case- and whitespace-insensitively', () => {
    const service = new LoginAttemptsService();

    for (let i = 0; i <= LOGIN_BACKOFF.freeFailures; i += 1) {
      service.recordFailure(i % 2 === 0 ? ' OWNER@example.com ' : EMAIL, T0);
    }

    expect(captureLock(service, T0)?.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  test('a success clears the history', () => {
    const service = new LoginAttemptsService();

    failTimes(service, LOGIN_BACKOFF.freeFailures + 1, T0);
    service.recordSuccess(EMAIL);
    service.recordFailure(EMAIL, T0);

    expect(captureLock(service, T0)).toBeNull();
  });
});
