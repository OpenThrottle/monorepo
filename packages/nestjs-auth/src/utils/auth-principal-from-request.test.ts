import { describe, expect, it } from 'vitest';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
} from '../auth-principal';
import { getAuthPrincipalFromRequest } from './auth-principal-from-request';

describe('getAuthPrincipalFromRequest', () => {
  describe('returns undefined for non-request inputs', () => {
    it('returns undefined when req is null', () => {
      expect(getAuthPrincipalFromRequest(null)).toBeUndefined();
    });

    it('returns undefined when req is not an object', () => {
      expect(getAuthPrincipalFromRequest('not-a-request')).toBeUndefined();
    });

    it('returns undefined when req has no user property', () => {
      expect(getAuthPrincipalFromRequest({ headers: {} })).toBeUndefined();
    });
  });

  describe('normalizes request.user', () => {
    it('returns undefined when user is invalid (no sub)', () => {
      expect(
        getAuthPrincipalFromRequest({ user: { email: 'x@example.com' } }),
      ).toBeUndefined();
    });

    it('normalizes a legacy JWT payload (no kind) to a user principal', () => {
      const principal = getAuthPrincipalFromRequest({
        user: { email: 'user@example.com', sub: 'user-uuid-1' },
      });

      expect(principal).toEqual({
        email: 'user@example.com',
        kind: AUTH_PRINCIPAL_KIND_USER,
        sub: 'user-uuid-1',
      });
    });

    it('passes through an explicit service-account principal', () => {
      const principal = getAuthPrincipalFromRequest({
        user: { kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT, sub: 'svc-1' },
      });

      expect(principal).toEqual({
        kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
        sub: 'svc-1',
      });
    });
  });
});
