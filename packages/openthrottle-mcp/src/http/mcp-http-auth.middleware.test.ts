import { describe, expect, it } from 'vitest';
import { requestAuthTokenStorage } from '../auth/get-auth-token.ts';
import {
  extractBearerToken,
  mcpHttpAuthMiddleware,
} from './mcp-http-auth.middleware.ts';

describe('extractBearerToken', () => {
  it('returns the token for a Bearer header', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('trims surrounding whitespace', () => {
    expect(extractBearerToken('Bearer   tok  ')).toBe('tok');
  });

  it('returns empty for a missing, non-Bearer, or malformed header', () => {
    expect(extractBearerToken(undefined)).toBe('');
    expect(extractBearerToken('Basic abc')).toBe('');
    expect(extractBearerToken('token-without-scheme')).toBe('');
  });
});

describe('mcpHttpAuthMiddleware', () => {
  const run = (authorization: string | undefined): string | undefined => {
    const middleware = mcpHttpAuthMiddleware();
    let seen: string | undefined;
    middleware({ headers: { authorization } }, {}, () => {
      seen = requestAuthTokenStorage.getStore();
    });
    return seen;
  };

  it('exposes the bearer token to the request-scoped store', () => {
    expect(run('Bearer human.jwt.here')).toBe('human.jwt.here');
  });

  it('leaves the store empty when no bearer header is present (env fallback)', () => {
    expect(run(undefined)).toBeUndefined();
    expect(run('Basic nope')).toBeUndefined();
  });

  it('isolates tokens across sequential requests (no leakage)', () => {
    expect(run('Bearer first')).toBe('first');
    // Outside any run(), the store is empty again.
    expect(requestAuthTokenStorage.getStore()).toBeUndefined();
    expect(run('Bearer second')).toBe('second');
  });
});
