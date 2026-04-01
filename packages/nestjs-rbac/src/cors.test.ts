import { afterEach, describe, expect, it } from 'vitest';
import { getCorsConfiguration, getCorsOptions } from './cors';

const CORS_ORIGINS = 'CORS_ORIGINS';
const CORS_CREDENTIALS = 'CORS_CREDENTIALS';
const CORS_ALLOWED_METHODS = 'CORS_ALLOWED_METHODS';

function withEnv(
  env: Record<string, string | undefined>,
  fn: () => void,
): void {
  const prev: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    prev[key] = process.env[key];
    if (env[key] !== undefined) process.env[key] = env[key];
    else delete process.env[key];
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(prev)) {
      if (prev[key] !== undefined) process.env[key] = prev[key];
      else delete process.env[key];
    }
  }
}

describe('getCorsOptions', () => {
  afterEach(() => {
    delete process.env[CORS_ORIGINS];
    delete process.env[CORS_CREDENTIALS];
    delete process.env[CORS_ALLOWED_METHODS];
  });

  describe('when no env is set', () => {
    it('returns allow-all origin, credentials true, default methods', () => {
      withEnv(
        {
          [CORS_ALLOWED_METHODS]: undefined,
          [CORS_CREDENTIALS]: undefined,
          [CORS_ORIGINS]: undefined,
        },
        () => {
          const opts = getCorsOptions();
          expect(opts.origin).toBe(true);
          expect(opts.credentials).toBe(true);
          expect(opts.methods).toEqual([
            'GET',
            'HEAD',
            'PUT',
            'PATCH',
            'POST',
            'DELETE',
            'OPTIONS',
          ]);
        },
      );
    });
  });

  describe('when CORS_ORIGINS is set', () => {
    it('parses comma-separated origins and trims whitespace', () => {
      withEnv({ [CORS_ORIGINS]: 'https://a.com , https://b.com ' }, () => {
        const opts = getCorsOptions();
        expect(opts.origin).toEqual(['https://a.com', 'https://b.com']);
      });
    });

    it('treats "*" as allow-all (true)', () => {
      withEnv({ [CORS_ORIGINS]: '*' }, () => {
        const opts = getCorsOptions();
        expect(opts.origin).toBe(true);
      });
    });
  });

  describe('when CORS_CREDENTIALS is set', () => {
    it('returns credentials false when CORS_CREDENTIALS is "false"', () => {
      withEnv({ [CORS_CREDENTIALS]: 'false' }, () => {
        const opts = getCorsOptions();
        expect(opts.credentials).toBe(false);
      });
    });

    it('returns credentials true when CORS_CREDENTIALS is "true"', () => {
      withEnv({ [CORS_CREDENTIALS]: 'true' }, () => {
        const opts = getCorsOptions();
        expect(opts.credentials).toBe(true);
      });
    });
  });

  describe('when CORS_ALLOWED_METHODS is set', () => {
    it('parses comma-separated methods and uppercases', () => {
      withEnv({ [CORS_ALLOWED_METHODS]: 'get, post, options' }, () => {
        const opts = getCorsOptions();
        expect(opts.methods).toEqual(['GET', 'POST', 'OPTIONS']);
      });
    });
  });
});

describe('getCorsConfiguration', () => {
  it('returns the same shape as getCorsOptions', () => {
    const opts = getCorsConfiguration();
    expect(opts).toHaveProperty('origin');
    expect(opts).toHaveProperty('credentials');
    expect(opts).toHaveProperty('methods');
    expect(getCorsConfiguration()).toEqual(getCorsOptions());
  });
});
