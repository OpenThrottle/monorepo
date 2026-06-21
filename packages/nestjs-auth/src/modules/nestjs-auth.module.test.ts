import { describe, expect, it } from 'vitest';
import { JWT_SECRET_MIN_BYTES } from '../strategies/jwt.strategy';
import { NESTJS_AUTH_OPTIONS } from '../config/nestjs-auth.tokens';
import { NestjsAuthModule } from './nestjs-auth.module';
import type { NestjsAuthOptions } from '../config/nestjs-auth.options';

const STRONG_SECRET = 'a'.repeat(JWT_SECRET_MIN_BYTES);

type FactoryProvider = {
  inject?: unknown[];
  provide: unknown;
  useFactory: (...args: unknown[]) => unknown;
};

const findFactoryProvider = (
  providers: ReadonlyArray<unknown>,
  provide: unknown,
): FactoryProvider => {
  const match = providers.find(
    (p): p is FactoryProvider =>
      typeof p === 'object' &&
      p !== null &&
      'useFactory' in p &&
      Reflect.get(p, 'provide') === provide,
  );

  if (!match) {
    throw new Error('expected a useFactory provider for the given token');
  }

  return match;
};

describe('NestjsAuthModule', () => {
  describe('DI token', () => {
    it('provides options under the exported NESTJS_AUTH_OPTIONS symbol', () => {
      const module = NestjsAuthModule.forRoot();
      const provided = (module.providers ?? []).some(
        (p) =>
          typeof p === 'object' &&
          p !== null &&
          Reflect.get(p, 'provide') === NESTJS_AUTH_OPTIONS,
      );

      expect(provided).toBe(true);
    });
  });

  describe('forRootAsync return-value validation', () => {
    it('accepts a factory returning valid options', async () => {
      const module = NestjsAuthModule.forRootAsync({
        useFactory: (): NestjsAuthOptions => ({ jwtSecret: STRONG_SECRET }),
      });

      const optionsProvider = findFactoryProvider(
        module.providers ?? [],
        NESTJS_AUTH_OPTIONS,
      );

      await expect(optionsProvider.useFactory()).resolves.toEqual({
        jwtSecret: STRONG_SECRET,
      });
    });

    it('rejects a factory returning a non-object', async () => {
      const module = NestjsAuthModule.forRootAsync({
        useFactory: () => undefined as unknown as NestjsAuthOptions,
      });

      const optionsProvider = findFactoryProvider(
        module.providers ?? [],
        NESTJS_AUTH_OPTIONS,
      );

      await expect(optionsProvider.useFactory()).rejects.toThrow(
        /must return a NestjsAuthOptions object/,
      );
    });

    it('rejects a factory returning an object without jwtSecret', async () => {
      const module = NestjsAuthModule.forRootAsync({
        useFactory: () => ({ jwtIssuer: 'x' }) as unknown as NestjsAuthOptions,
      });

      const optionsProvider = findFactoryProvider(
        module.providers ?? [],
        NESTJS_AUTH_OPTIONS,
      );

      await expect(optionsProvider.useFactory()).rejects.toThrow(
        /jwtSecret must be a non-empty string/,
      );
    });
  });
});
