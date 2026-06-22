import type { Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { describe, expect, it } from 'vitest';
import { NestjsThrottlerError } from '../config/nestjs-throttler.error';
import {
  applyNestjsThrottlerModuleDefaults,
  DEFAULT_THROTTLER_LIMIT,
  DEFAULT_THROTTLER_TTL_MS,
  validateNestjsThrottlerModuleOptions,
} from '../config/nestjs-throttler.options';
import { NestjsThrottlerModule } from './nestjs-throttler.module';

describe('applyNestjsThrottlerModuleDefaults', () => {
  it('applies the default tier when none provided', () => {
    expect(applyNestjsThrottlerModuleDefaults({}).throttlers).toEqual([
      { limit: DEFAULT_THROTTLER_LIMIT, ttl: DEFAULT_THROTTLER_TTL_MS },
    ]);
  });

  it('applies the default tier when an empty array is provided', () => {
    expect(
      applyNestjsThrottlerModuleDefaults({ throttlers: [] }).throttlers,
    ).toEqual([
      { limit: DEFAULT_THROTTLER_LIMIT, ttl: DEFAULT_THROTTLER_TTL_MS },
    ]);
  });

  it('preserves caller-supplied tiers', () => {
    const throttlers = [
      { limit: 5, name: 'anon', ttl: 1_000 },
      { limit: 100, name: 'auth', ttl: 60_000 },
    ];

    expect(
      applyNestjsThrottlerModuleDefaults({ throttlers }).throttlers,
    ).toEqual(throttlers);
  });
});

describe('validateNestjsThrottlerModuleOptions', () => {
  it('accepts undefined throttlers (defaults applied later)', () => {
    expect(() => validateNestjsThrottlerModuleOptions({})).not.toThrow();
  });

  it('throws when options are null', () => {
    expect(() => validateNestjsThrottlerModuleOptions(null)).toThrow(
      NestjsThrottlerError,
    );
  });

  it('throws when a tier limit is not a positive integer', () => {
    expect(() =>
      validateNestjsThrottlerModuleOptions({
        throttlers: [{ limit: 0, ttl: 1_000 }],
      }),
    ).toThrow(NestjsThrottlerError);
  });

  it('throws when a tier ttl is not a positive integer', () => {
    expect(() =>
      validateNestjsThrottlerModuleOptions({
        throttlers: [{ limit: 10, ttl: -1 }],
      }),
    ).toThrow(NestjsThrottlerError);
  });

  it('throws when a tier name is an empty string', () => {
    expect(() =>
      validateNestjsThrottlerModuleOptions({
        throttlers: [{ limit: 10, name: '  ', ttl: 1_000 }],
      }),
    ).toThrow(NestjsThrottlerError);
  });
});

const bindsThrottlerGuard = (
  providers: ReadonlyArray<Provider> | undefined,
): boolean =>
  (providers ?? []).some(
    (provider) =>
      typeof provider === 'object' &&
      'provide' in provider &&
      provider.provide === APP_GUARD &&
      'useClass' in provider &&
      provider.useClass === ThrottlerGuard,
  );

describe('NestjsThrottlerModule', () => {
  it('compiles when imported directly (default tier)', async () => {
    const app = await Test.createTestingModule({
      imports: [NestjsThrottlerModule],
    }).compile();

    expect(app).toBeDefined();
  });

  it('forRoot binds ThrottlerGuard as APP_GUARD and compiles with custom tiers', async () => {
    const dynamic = NestjsThrottlerModule.forRoot({
      throttlers: [{ limit: 3, ttl: 5_000 }],
    });

    expect(dynamic.module).toBe(NestjsThrottlerModule);
    expect(bindsThrottlerGuard(dynamic.providers)).toBe(true);

    const app = await Test.createTestingModule({
      imports: [dynamic],
    }).compile();

    expect(app).toBeDefined();
  });

  it('forRoot validates options before wiring', () => {
    expect(() =>
      NestjsThrottlerModule.forRoot({ throttlers: [{ limit: 0, ttl: 1 }] }),
    ).toThrow(NestjsThrottlerError);
  });

  it('forRoot registers globally when isGlobal is true', () => {
    expect(NestjsThrottlerModule.forRoot({ isGlobal: true }).global).toBe(true);
    expect(NestjsThrottlerModule.forRoot().global).toBe(false);
  });

  it('forRootAsync binds the guard and resolves options from a factory', async () => {
    const dynamic = NestjsThrottlerModule.forRootAsync({
      useFactory: async () => ({
        throttlers: [{ limit: 7, ttl: 2_000 }],
      }),
    });

    expect(bindsThrottlerGuard(dynamic.providers)).toBe(true);

    const app = await Test.createTestingModule({
      imports: [dynamic],
    }).compile();

    expect(app).toBeDefined();
  });

  it('forRootAsync rejects invalid factory output at bootstrap', async () => {
    await expect(
      Test.createTestingModule({
        imports: [
          NestjsThrottlerModule.forRootAsync({
            useFactory: async () => ({ throttlers: [{ limit: -1, ttl: 1 }] }),
          }),
        ],
      }).compile(),
    ).rejects.toThrow(NestjsThrottlerError);
  });
});
