import { describe, expect, test } from 'vitest';
import type { ServiceAccountCredentialFieldsFragment } from '~/__generated__/graphql';
import {
  credentialDisplayName,
  credentialRowId,
  credentialStatusBadgeColor,
  credentialStatusLabels,
  formatCredentialTimestamp,
  getSettingsKeysCredentialStatus,
} from '../settings-keys-credential';

const credential = (
  overrides: Partial<ServiceAccountCredentialFieldsFragment> = {},
): ServiceAccountCredentialFieldsFragment => ({
  __typename: 'ServiceAccountCredentialObject',
  createdAt: '2025-01-01T00:00:00Z',
  expiresAt: null,
  id: 'cred-1',
  label: 'CI key',
  lastUsedAt: null,
  prefix: 'sk_live_abcd',
  revokedAt: null,
  serviceAccountId: 'sa-1',
  ...overrides,
});

describe('getSettingsKeysCredentialStatus', () => {
  test('returns "revoked" when revokedAt is set', () => {
    expect(
      getSettingsKeysCredentialStatus(
        credential({ revokedAt: '2025-01-05T00:00:00Z' }),
      ),
    ).toBe('revoked');
  });

  test('returns "expired" when expiresAt is in the past', () => {
    expect(
      getSettingsKeysCredentialStatus(
        credential({ expiresAt: '2000-01-01T00:00:00Z' }),
      ),
    ).toBe('expired');
  });

  test('returns "active" when expiresAt is in the future', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    expect(
      getSettingsKeysCredentialStatus(credential({ expiresAt: future })),
    ).toBe('active');
  });

  test('returns "active" when neither revokedAt nor expiresAt is set', () => {
    expect(getSettingsKeysCredentialStatus(credential())).toBe('active');
  });

  test('prefers "revoked" over an expired date', () => {
    expect(
      getSettingsKeysCredentialStatus(
        credential({
          expiresAt: '2000-01-01T00:00:00Z',
          revokedAt: '2025-01-05T00:00:00Z',
        }),
      ),
    ).toBe('revoked');
  });

  test('returns "active" when expiresAt is an invalid date', () => {
    expect(
      getSettingsKeysCredentialStatus(credential({ expiresAt: 'not-a-date' })),
    ).toBe('active');
  });
});

describe('credentialStatusLabels', () => {
  test('has a human-readable label for each status', () => {
    expect(credentialStatusLabels).toEqual({
      active: 'Active',
      expired: 'Expired',
      revoked: 'Revoked',
    });
  });
});

describe('credentialStatusBadgeColor', () => {
  test('maps each status to a badge color', () => {
    expect(credentialStatusBadgeColor).toEqual({
      active: 'green',
      expired: 'amber',
      revoked: 'slate',
    });
  });
});

describe('formatCredentialTimestamp', () => {
  test('returns em dash for non-date-like input', () => {
    expect(formatCredentialTimestamp({})).toBe('—');
  });

  test('returns em dash for an invalid date string', () => {
    expect(formatCredentialTimestamp('not-a-date')).toBe('—');
  });

  test('formats a valid ISO date string', () => {
    const result = formatCredentialTimestamp('2025-01-02T12:00:00Z');
    expect(result).not.toBe('—');
    expect(result).toMatch(/\d/);
  });

  test('formats a valid numeric timestamp', () => {
    const result = formatCredentialTimestamp(1735819200000);
    expect(result).not.toBe('—');
    expect(result).toMatch(/\d/);
  });

  test('formats a Date instance', () => {
    const result = formatCredentialTimestamp(new Date('2025-01-02T12:00:00Z'));
    expect(result).not.toBe('—');
    expect(result).toMatch(/\d/);
  });
});

describe('credentialRowId', () => {
  test('returns the credential id', () => {
    expect(credentialRowId(credential({ id: 'cred-42' }))).toBe('cred-42');
  });
});

describe('credentialDisplayName', () => {
  test('returns the trimmed label when present', () => {
    expect(credentialDisplayName(credential({ label: '  My Key  ' }))).toBe(
      'My Key',
    );
  });

  test('falls back to the prefix when label is null', () => {
    expect(
      credentialDisplayName(credential({ label: null, prefix: 'sk_live_xyz' })),
    ).toBe('sk_live_xyz');
  });

  test('falls back to the prefix when label is an empty string', () => {
    expect(
      credentialDisplayName(credential({ label: '', prefix: 'sk_live_xyz' })),
    ).toBe('sk_live_xyz');
  });

  test('falls back to the prefix when label is only whitespace', () => {
    expect(
      credentialDisplayName(
        credential({ label: '   ', prefix: 'sk_live_xyz' }),
      ),
    ).toBe('sk_live_xyz');
  });
});
