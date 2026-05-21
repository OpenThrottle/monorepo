import { describe, expect, it } from 'vitest';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
  authPrincipalFromJwtPayload,
  getAuthPrincipalSub,
  isAuthPrincipal,
  normalizeRequestAuthPrincipal,
} from './auth-principal';

describe('authPrincipalFromJwtPayload', () => {
  it('maps JWT payload to user principal', () => {
    expect(
      authPrincipalFromJwtPayload({
        email: 'a@b.com',
        roles: ['admin'],
        sub: 'user-1',
      }),
    ).toEqual({
      email: 'a@b.com',
      kind: AUTH_PRINCIPAL_KIND_USER,
      roles: ['admin'],
      sub: 'user-1',
    });
  });
});

describe('normalizeRequestAuthPrincipal', () => {
  it('accepts legacy JWT payload without kind', () => {
    expect(
      normalizeRequestAuthPrincipal({ email: 'x@y.z', sub: 'legacy' }),
    ).toEqual({
      email: 'x@y.z',
      kind: AUTH_PRINCIPAL_KIND_USER,
      sub: 'legacy',
    });
  });

  it('accepts explicit user principal', () => {
    expect(
      normalizeRequestAuthPrincipal({
        kind: AUTH_PRINCIPAL_KIND_USER,
        sub: 'u-2',
      }),
    ).toEqual({ kind: AUTH_PRINCIPAL_KIND_USER, sub: 'u-2' });
  });

  it('accepts service account principal', () => {
    expect(
      normalizeRequestAuthPrincipal({
        kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
        sub: 'sa-1',
      }),
    ).toEqual({
      kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
      sub: 'sa-1',
    });
  });

  it('returns undefined for invalid shapes', () => {
    expect(normalizeRequestAuthPrincipal(null)).toBeUndefined();
    expect(normalizeRequestAuthPrincipal({})).toBeUndefined();
    expect(
      normalizeRequestAuthPrincipal({ kind: 'other', sub: 'x' }),
    ).toBeUndefined();
  });
});

describe('isAuthPrincipal', () => {
  it('narrows service account principals', () => {
    const principal = {
      kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
      sub: 'sa-9',
    };
    expect(isAuthPrincipal(principal)).toBe(true);
    if (isAuthPrincipal(principal)) {
      expect(getAuthPrincipalSub(principal)).toBe('sa-9');
    }
  });
});
