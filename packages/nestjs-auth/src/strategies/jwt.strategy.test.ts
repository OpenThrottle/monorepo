import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import type { NestjsAuthOptions } from '../config/nestjs-auth.options';
import { JWT_SECRET_MIN_BYTES, JwtStrategy } from './jwt.strategy';

const createConfigService = (
  values: Readonly<Record<string, string | undefined>>,
): ConfigService =>
  ({
    get: (key: string): string | undefined => values[key],
  }) as unknown as ConfigService;

const STRONG_SECRET = 'a'.repeat(JWT_SECRET_MIN_BYTES);

describe('JwtStrategy', () => {
  describe('constructor secret validation', () => {
    it('throws when no secret is provided', () => {
      expect(() => new JwtStrategy(createConfigService({}))).toThrow(
        /JWT_SECRET or NestjsAuthOptions\.jwtSecret is required/,
      );
    });

    it('throws when the env secret is shorter than the minimum byte length', () => {
      const short = 'a'.repeat(JWT_SECRET_MIN_BYTES - 1);
      expect(
        () => new JwtStrategy(createConfigService({ JWT_SECRET: short })),
      ).toThrow(new RegExp(`at least ${JWT_SECRET_MIN_BYTES} bytes`));
    });

    it('throws when the options secret is shorter than the minimum byte length', () => {
      const options: NestjsAuthOptions = { jwtSecret: 'short' };
      expect(() => new JwtStrategy(createConfigService({}), options)).toThrow(
        new RegExp(`at least ${JWT_SECRET_MIN_BYTES} bytes`),
      );
    });

    it('counts bytes (not characters) so multi-byte secrets are not over-counted', () => {
      // 16 multi-byte characters = 16 chars but 48 bytes (>= 32), yet would be
      // < 32 if measured by char length only for a shorter string.
      const multiByte = '€'.repeat(JWT_SECRET_MIN_BYTES - 1);
      expect(
        () => new JwtStrategy(createConfigService({ JWT_SECRET: multiByte })),
      ).not.toThrow();
    });

    it('accepts an env secret meeting the minimum byte length', () => {
      expect(
        () =>
          new JwtStrategy(createConfigService({ JWT_SECRET: STRONG_SECRET })),
      ).not.toThrow();
    });

    it('accepts an options secret meeting the minimum byte length', () => {
      const options: NestjsAuthOptions = { jwtSecret: STRONG_SECRET };
      expect(
        () => new JwtStrategy(createConfigService({}), options),
      ).not.toThrow();
    });
  });

  describe('audience binding (opt-in)', () => {
    it('constructs without an audience when none is configured', () => {
      expect(
        () =>
          new JwtStrategy(createConfigService({ JWT_SECRET: STRONG_SECRET })),
      ).not.toThrow();
    });

    it('constructs with an audience supplied via options', () => {
      const options: NestjsAuthOptions = {
        jwtAudience: 'openthrottle-server',
        jwtSecret: STRONG_SECRET,
      };
      expect(
        () => new JwtStrategy(createConfigService({}), options),
      ).not.toThrow();
    });

    it('constructs with an audience supplied via env JWT_AUDIENCE', () => {
      expect(
        () =>
          new JwtStrategy(
            createConfigService({
              JWT_AUDIENCE: 'openthrottle-server',
              JWT_SECRET: STRONG_SECRET,
            }),
          ),
      ).not.toThrow();
    });
  });
});
