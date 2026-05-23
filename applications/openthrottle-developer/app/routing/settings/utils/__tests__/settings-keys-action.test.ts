import { describe, expect, test } from 'vitest';
import {
  parseCredentialIdFromFormData,
  parseExpiresAtFromFormData,
  parseServiceAccountIdFromFormData,
  resolveSelectedServiceAccountId,
  SETTINGS_KEYS_ACCOUNT_SEARCH_PARAM,
} from '../settings-keys-action';

describe('settings-keys-action', () => {
  describe('resolveSelectedServiceAccountId', () => {
    const accounts = [
      { disabledAt: null, id: 'sa-a' },
      { disabledAt: '2026-05-01T00:00:00.000Z', id: 'sa-disabled' },
      { disabledAt: null, id: 'sa-b' },
    ];

    test('returns null when all accounts are disabled', () => {
      expect(
        resolveSelectedServiceAccountId(
          [{ disabledAt: '2026-05-01T00:00:00.000Z', id: 'sa-x' }],
          null,
        ),
      ).toBeNull();
    });

    test('returns first enabled account when search param is absent', () => {
      expect(resolveSelectedServiceAccountId(accounts, null)).toBe('sa-a');
    });

    test('returns matching enabled account from search param', () => {
      expect(resolveSelectedServiceAccountId(accounts, 'sa-b')).toBe('sa-b');
    });

    test('falls back to first enabled account when search param is invalid', () => {
      expect(resolveSelectedServiceAccountId(accounts, 'missing')).toBe('sa-a');
    });

    test('falls back when search param references a disabled account', () => {
      expect(resolveSelectedServiceAccountId(accounts, 'sa-disabled')).toBe(
        'sa-a',
      );
    });
  });

  test('SETTINGS_KEYS_ACCOUNT_SEARCH_PARAM is account', () => {
    expect(SETTINGS_KEYS_ACCOUNT_SEARCH_PARAM).toBe('account');
  });

  describe('parseExpiresAtFromFormData', () => {
    test('returns null for empty or invalid values', () => {
      expect(parseExpiresAtFromFormData(null)).toBeNull();
      expect(parseExpiresAtFromFormData('')).toBeNull();
      expect(parseExpiresAtFromFormData('not-a-date')).toBeNull();
    });

    test('parses ISO date strings', () => {
      const parsed = parseExpiresAtFromFormData('2026-12-31T00:00:00.000Z');
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.toISOString()).toBe('2026-12-31T00:00:00.000Z');
    });
  });

  describe('parseServiceAccountIdFromFormData', () => {
    test('trims and returns id or null', () => {
      expect(parseServiceAccountIdFromFormData('  sa-1  ')).toBe('sa-1');
      expect(parseServiceAccountIdFromFormData('   ')).toBeNull();
    });
  });

  describe('parseCredentialIdFromFormData', () => {
    test('trims and returns id or null', () => {
      expect(parseCredentialIdFromFormData('cred-1')).toBe('cred-1');
      expect(parseCredentialIdFromFormData(null)).toBeNull();
    });
  });
});
