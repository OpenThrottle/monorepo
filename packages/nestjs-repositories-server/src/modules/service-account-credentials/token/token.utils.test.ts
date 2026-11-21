import { describe, expect, it } from 'vitest';

import { SERVICE_ACCOUNT_BEARER_PREFIX } from './token.constants.ts';
import {
  deriveServiceAccountToken,
  formatServiceAccountToken,
  normalizeServiceAccountBearerToken,
  parseServiceAccountToken,
  safeEqualStrings,
} from './token.utils.ts';

describe('token.utils', () => {
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

  describe('deriveServiceAccountToken', () => {
    const parent = `${SERVICE_ACCOUNT_BEARER_PREFIX}parentprefix_parentsecret`;

    it('derives a parseable ot_sa token', () => {
      const child = deriveServiceAccountToken(parent, 'telemetry-ingest');

      expect(parseServiceAccountToken(child)).toEqual({
        prefix: expect.stringMatching(/^[a-f0-9]{12}$/),
        secret: expect.stringMatching(/^[a-f0-9]{52}$/),
      });
    });

    it('is stable for the same parent and purpose', () => {
      expect(deriveServiceAccountToken(parent, 'telemetry-ingest')).toBe(
        deriveServiceAccountToken(` ${parent} `, 'telemetry-ingest'),
      );
    });

    it('differs by purpose and by parent, and never equals the parent', () => {
      const child = deriveServiceAccountToken(parent, 'telemetry-ingest');

      expect(child).not.toBe(deriveServiceAccountToken(parent, 'other'));
      expect(child).not.toBe(
        deriveServiceAccountToken(`${parent}x`, 'telemetry-ingest'),
      );
      expect(child).not.toBe(parent);
    });
  });
});
