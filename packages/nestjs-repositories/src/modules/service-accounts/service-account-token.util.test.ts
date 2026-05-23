import { describe, expect, it } from 'vitest';
import {
  formatServiceAccountToken,
  normalizeServiceAccountBearerToken,
  parseServiceAccountToken,
  safeEqualStrings,
  SERVICE_ACCOUNT_BEARER_PREFIX,
} from './service-account-token.util';

describe('service-account-token.util', () => {
  describe('normalizeServiceAccountBearerToken', () => {
    it('accepts raw ot_sa token', () => {
      const token = `${SERVICE_ACCOUNT_BEARER_PREFIX}abc123_secret456`;
      expect(normalizeServiceAccountBearerToken(token)).toBe(token);
    });

    it('strips Bearer prefix', () => {
      const token = `${SERVICE_ACCOUNT_BEARER_PREFIX}abc123_secret456`;
      expect(normalizeServiceAccountBearerToken(`Bearer ${token}`)).toBe(token);
    });

    it('returns null for non-service-account tokens', () => {
      expect(normalizeServiceAccountBearerToken('eyJhbGciOiJIUzI1NiJ9')).toBe(
        null,
      );
    });
  });

  describe('parseServiceAccountToken', () => {
    it('parses prefix and secret', () => {
      expect(
        parseServiceAccountToken(`${SERVICE_ACCOUNT_BEARER_PREFIX}Ab12_xY9z`),
      ).toEqual({ prefix: 'Ab12', secret: 'xY9z' });
    });

    it('rejects missing secret', () => {
      expect(
        parseServiceAccountToken(`${SERVICE_ACCOUNT_BEARER_PREFIX}only`),
      ).toBe(null);
    });

    it('rejects non-alphanumeric segments', () => {
      expect(
        parseServiceAccountToken(`${SERVICE_ACCOUNT_BEARER_PREFIX}a_b-c`),
      ).toBe(null);
    });
  });

  describe('formatServiceAccountToken', () => {
    it('round-trips with parse', () => {
      const formatted = formatServiceAccountToken('prefix12', 'secret99');
      expect(parseServiceAccountToken(formatted)).toEqual({
        prefix: 'prefix12',
        secret: 'secret99',
      });
    });
  });

  describe('safeEqualStrings', () => {
    it('returns true for equal strings', () => {
      expect(safeEqualStrings('abc', 'abc')).toBe(true);
    });

    it('returns false for different lengths', () => {
      expect(safeEqualStrings('abc', 'abcd')).toBe(false);
    });
  });
});
