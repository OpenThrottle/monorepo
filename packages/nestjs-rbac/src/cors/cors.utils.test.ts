import { afterEach, describe, expect, it } from 'vitest';

import { getCorsConfiguration, getCorsOptions } from './cors.utils.ts';

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
    it('returns allow-all origin, credentials false (safe default), default methods', () => {
      withEnv(
        {
          [CORS_ALLOWED_METHODS]: undefined,
          [CORS_CREDENTIALS]: undefined,
          [CORS_ORIGINS]: undefined,
        },
        () => {
          const opts = getCorsOptions();
          expect(opts.origin).toBe(true);
          expect(opts.credentials).toBe(false);
          expect(opts.methods).toEqual([
            'DELETE',
            'GET',
            'HEAD',
            'OPTIONS',
            'PATCH',
            'POST',
            'PUT',
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

    it('defaults credentials to true when an explicit origin allowlist is set', () => {
      withEnv({ [CORS_ORIGINS]: 'https://a.com' }, () => {
        const opts = getCorsOptions();
        expect(opts.origin).toEqual(['https://a.com']);
        expect(opts.credentials).toBe(true);
      });
    });

    it('defaults credentials to false when origin is allow-all ("*")', () => {
      withEnv({ [CORS_ORIGINS]: '*' }, () => {
        const opts = getCorsOptions();
        expect(opts.credentials).toBe(false);
      });
    });
  });

  describe('when CORS_CREDENTIALS is set', () => {
    it('refuses explicit CORS_CREDENTIALS=true with an allow-all origin', () => {
      withEnv({ [CORS_CREDENTIALS]: 'true', [CORS_ORIGINS]: '*' }, () => {
        expect(() => getCorsOptions()).toThrow(/allow-all origin/);
      });
    });

    it('refuses CORS_CREDENTIALS=true when CORS_ORIGINS is unset', () => {
      withEnv({ [CORS_CREDENTIALS]: 'true', [CORS_ORIGINS]: undefined }, () => {
        expect(() => getCorsOptions()).toThrow(/allow-all origin/);
      });
    });

    it('returns credentials false when CORS_CREDENTIALS is "false"', () => {
      withEnv({ [CORS_CREDENTIALS]: 'false' }, () => {
        const opts = getCorsOptions();
        expect(opts.credentials).toBe(false);
      });
    });

    it('returns credentials true when CORS_CREDENTIALS is "true"', () => {
      withEnv(
        { [CORS_CREDENTIALS]: 'true', [CORS_ORIGINS]: 'https://a.com' },
        () => {
          const opts = getCorsOptions();
          expect(opts.credentials).toBe(true);
        },
      );
    });
  });

  describe('when NODE_ENV is production', () => {
    it('refuses an allow-all origin', () => {
      withEnv({ [CORS_ORIGINS]: '*', NODE_ENV: 'production' }, () => {
        expect(() => getCorsOptions()).toThrow(/in production/);
      });
    });

    it('refuses an unset origin', () => {
      withEnv({ [CORS_ORIGINS]: undefined, NODE_ENV: 'production' }, () => {
        expect(() => getCorsOptions()).toThrow(/in production/);
      });
    });

    it('allows allow-all with CORS_ALLOW_ALL_ORIGINS=true', () => {
      withEnv(
        {
          CORS_ALLOW_ALL_ORIGINS: 'true',
          [CORS_ORIGINS]: '*',
          NODE_ENV: 'production',
        },
        () => {
          const opts = getCorsOptions();
          expect(opts.origin).toBe(true);
          expect(opts.credentials).toBe(false);
        },
      );
    });

    it('accepts an explicit allowlist', () => {
      withEnv(
        { [CORS_ORIGINS]: 'https://a.com', NODE_ENV: 'production' },
        () => {
          expect(getCorsOptions().origin).toEqual(['https://a.com']);
        },
      );
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
